import { isDemoSession } from "@/lib/demo/session";
import { demoDashboard } from "@/lib/demo/operations";
import { addDays, todayInTimeZone, weekRange } from "@/lib/dates";
import { one } from "@/lib/data/relations";
import { userFacingError } from "@/lib/errors";
import { findScheduleWarnings, type ScheduleWarning } from "@/lib/scheduling/conflicts";
import { summarizeWork, type WorkStatRow } from "@/lib/scheduling/stats";
import { createClient } from "@/lib/supabase/server";
import type { ShiftRow, TimeOffRow, VacationRow } from "@/types/database";

export type DashboardRequest = {
  id: string;
  kind: "time_off" | "vacation" | "swap";
  label: string;
  person: string;
  detail: string;
  status: string;
  created_at: string;
};

export type WorkStats = {
  weekStart: string;
  weekEnd: string;
  totalMinutes: number;
  shiftCount: number;
  byEmployee: WorkStatRow[];
  byDepartment: WorkStatRow[];
  attendance: { present: number; late: number; absent: number };
  attendanceRecorded: boolean;
};

export type DashboardData = {
  employeeCount: number;
  workingToday: number;
  offToday: number;
  requestCount: number;
  shifts: ShiftRow[];
  warnings: ScheduleWarning[];
  requests: DashboardRequest[];
  stats: WorkStats;
  error: string | null;
};

const shiftSelect = `
  id, employee_id, shift_date, start_time, end_time, status,
  employee:employees(id, first_name, last_name, avatar_url),
  position:positions(name),
  department:departments(name, color_token)
`;

function mapShift(row: Record<string, unknown>): ShiftRow {
  return {
    id: String(row.id),
    employee_id: String(row.employee_id),
    shift_date: String(row.shift_date),
    start_time: String(row.start_time),
    end_time: String(row.end_time),
    status: row.status as ShiftRow["status"],
    employee: one(row.employee as ShiftRow["employee"] | NonNullable<ShiftRow["employee"]>[]),
    position: one(row.position as ShiftRow["position"] | NonNullable<ShiftRow["position"]>[]),
    department: one(row.department as ShiftRow["department"] | NonNullable<ShiftRow["department"]>[]),
  };
}

function personName(value: { first_name?: string; last_name?: string } | null | undefined) {
  if (!value?.first_name) {
    return "თანამშრომელი";
  }
  return `${value.first_name} ${value.last_name ?? ""}`.trim();
}

export async function getDashboard(timeZone: string, employeeId?: string): Promise<DashboardData> {
  if (await isDemoSession()) {
    return demoDashboard(timeZone, employeeId);
  }

  const supabase = await createClient();
  const today = todayInTimeZone(timeZone);
  const yesterday = addDays(today, -1);
  const week = weekRange(today);

  let shiftQuery = supabase
    .from("shifts")
    .select(shiftSelect)
    .in("shift_date", [yesterday, today])
    .neq("status", "cancelled")
    .order("start_time");

  if (employeeId) {
    shiftQuery = shiftQuery.eq("employee_id", employeeId);
  }

  let weekShiftQuery = supabase
    .from("shifts")
    .select(shiftSelect)
    .gte("shift_date", week.start)
    .lte("shift_date", week.end)
    .neq("status", "cancelled");
  let attendanceQuery = supabase
    .from("attendance")
    .select("status")
    .gte("attendance_date", week.start)
    .lte("attendance_date", week.end);
  if (employeeId) {
    weekShiftQuery = weekShiftQuery.eq("employee_id", employeeId);
    attendanceQuery = attendanceQuery.eq("employee_id", employeeId);
  }

  const [employeesResult, shiftsResult, weekShiftsResult, attendanceResult, timeOffResult, vacationResult, swapResult, pendingOff, pendingVacation, pendingSwap] =
    await Promise.all([
    employeeId
      ? Promise.resolve({ count: null, error: null })
      : supabase.from("employees").select("id", { count: "exact", head: true }).eq("is_active", true),
    shiftQuery,
    weekShiftQuery,
    attendanceQuery,
    supabase
      .from("time_off_requests")
      .select("id, employee_id, request_date, reason, status, created_at, employee:employees(first_name, last_name)")
      .in("status", employeeId ? ["pending", "approved", "rejected"] : ["pending", "approved"])
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("vacation_requests")
      .select("id, employee_id, start_date, end_date, note, status, created_at, employee:employees(first_name, last_name)")
      .in("status", employeeId ? ["pending", "approved", "rejected"] : ["pending", "approved"])
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("shift_swap_requests")
      .select(
        "id, status, created_at, requester:employees!shift_swap_requests_requester_employee_id_fkey(first_name, last_name), target:employees!shift_swap_requests_target_employee_id_fkey(first_name, last_name)",
      )
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("time_off_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("vacation_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("shift_swap_requests")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending_peer", "pending_manager"]),
  ]);

  const firstError =
    employeesResult.error ||
    shiftsResult.error ||
    weekShiftsResult.error ||
    attendanceResult.error ||
    timeOffResult.error ||
    vacationResult.error ||
    swapResult.error ||
    pendingOff.error ||
    pendingVacation.error ||
    pendingSwap.error;
  if (firstError) {
    return emptyDashboard(userFacingError(firstError));
  }

  const shifts = ((shiftsResult.data ?? []) as Record<string, unknown>[]).map(mapShift);
  const todayShifts = shifts.filter((shift) => shift.shift_date === today);
  const employeeIds = [...new Set(todayShifts.map((shift) => shift.employee_id))];

  const [availabilityResult, approvedOffResult, approvedVacationResult] = await Promise.all([
    employeeIds.length
      ? supabase
          .from("employee_availability")
          .select("id, employee_id, day_of_week, is_unavailable, start_time, end_time")
          .in("employee_id", employeeIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("time_off_requests")
      .select("id, employee_id, request_date, reason, status, created_at")
      .eq("status", "approved")
      .eq("request_date", today),
    supabase
      .from("vacation_requests")
      .select("id, employee_id, start_date, end_date, note, status, created_at")
      .eq("status", "approved")
      .lte("start_date", today)
      .gte("end_date", today),
  ]);

  if (availabilityResult.error || approvedOffResult.error || approvedVacationResult.error) {
    return emptyDashboard(
      userFacingError(availabilityResult.error || approvedOffResult.error || approvedVacationResult.error),
    );
  }

  const warnings = findScheduleWarnings({
    shifts,
    availability: availabilityResult.data ?? [],
    timeOff: (approvedOffResult.data ?? []) as TimeOffRow[],
    vacations: (approvedVacationResult.data ?? []) as VacationRow[],
  }).filter((warning) => todayShifts.some((shift) => warning.id.includes(shift.id)));

  const requests = [
    ...((timeOffResult.data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      kind: "time_off" as const,
      label: "დასვენების დღე",
      person: personName(one(row.employee as { first_name: string; last_name: string } | null)),
      detail: String(row.request_date),
      status: String(row.status),
      created_at: String(row.created_at),
    })),
    ...((vacationResult.data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      kind: "vacation" as const,
      label: "შვებულება",
      person: personName(one(row.employee as { first_name: string; last_name: string } | null)),
      detail: `${row.start_date} – ${row.end_date}`,
      status: String(row.status),
      created_at: String(row.created_at),
    })),
    ...((swapResult.data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      kind: "swap" as const,
      label: "ცვლის გაცვლა",
      person: personName(one(row.requester as { first_name: string; last_name: string } | null)),
      detail: personName(one(row.target as { first_name: string; last_name: string } | null)),
      status: String(row.status),
      created_at: String(row.created_at),
    })),
  ]
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .slice(0, 6);

  const workingIds = new Set(todayShifts.map((shift) => shift.employee_id));
  const employeeCount = employeesResult.count ?? (employeeId ? 1 : 0);
  const weekShifts = ((weekShiftsResult.data ?? []) as Record<string, unknown>[]).map(mapShift);
  const attendanceRows = (attendanceResult.data ?? []) as { status: string }[];
  const attendance = { present: 0, late: 0, absent: 0 };
  for (const row of attendanceRows) {
    if (row.status === "present" || row.status === "late" || row.status === "absent") {
      attendance[row.status] += 1;
    }
  }
  const summary = summarizeWork(weekShifts);

  return {
    employeeCount,
    workingToday: workingIds.size,
    offToday: Math.max(employeeCount - workingIds.size, 0),
    requestCount: (pendingOff.count ?? 0) + (pendingVacation.count ?? 0) + (pendingSwap.count ?? 0),
    shifts: todayShifts,
    warnings,
    requests,
    stats: {
      weekStart: week.start,
      weekEnd: week.end,
      ...summary,
      attendance,
      attendanceRecorded: attendanceRows.length > 0,
    },
    error: null,
  };
}

function emptyDashboard(error: string): DashboardData {
  return {
    employeeCount: 0,
    workingToday: 0,
    offToday: 0,
    requestCount: 0,
    shifts: [],
    warnings: [],
    requests: [],
    stats: {
      weekStart: "",
      weekEnd: "",
      totalMinutes: 0,
      shiftCount: 0,
      byEmployee: [],
      byDepartment: [],
      attendance: { present: 0, late: 0, absent: 0 },
      attendanceRecorded: false,
    },
    error,
  };
}
