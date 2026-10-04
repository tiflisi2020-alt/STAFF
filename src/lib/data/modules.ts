import { isDemoSession } from "@/lib/demo/session";
import {
  demoAttendanceDay,
  demoListNotifications,
  demoListSwaps,
  demoListTimeOff,
  demoListVacations,
  demoUpcomingShifts,
  demoWeekBoard,
  type AttendanceLine,
  type SwapView,
  type WeekBoard,
} from "@/lib/demo/operations";
import { addDays, todayInTimeZone, weekRange } from "@/lib/dates";
import { one } from "@/lib/data/relations";
import { userFacingError } from "@/lib/errors";
import { findScheduleWarnings } from "@/lib/scheduling/conflicts";
import { createClient } from "@/lib/supabase/server";
import type { Department, Employee, Position, ShiftRow, TimeOffRow, VacationRow } from "@/types/database";
import type { StoredNotification } from "@/lib/demo/store";

const shiftSelect = `
  id, employee_id, shift_date, start_time, end_time, status,
  employee:employees(id, first_name, last_name),
  position:positions(name),
  department:departments(name, color_token)
`;

function mapShift(row: Record<string, unknown>): ShiftRow {
  return {
    id: String(row.id),
    employee_id: String(row.employee_id),
    shift_date: String(row.shift_date),
    start_time: String(row.start_time).slice(0, 5),
    end_time: String(row.end_time).slice(0, 5),
    status: row.status as ShiftRow["status"],
    employee: one(row.employee as ShiftRow["employee"] | NonNullable<ShiftRow["employee"]>[]),
    position: one(row.position as ShiftRow["position"] | NonNullable<ShiftRow["position"]>[]),
    department: one(row.department as ShiftRow["department"] | NonNullable<ShiftRow["department"]>[]),
  };
}

function emptyBoard(weekStart: string, error: string | null): WeekBoard {
  const range = weekRange(weekStart);
  return {
    weekStart: range.start,
    weekEnd: range.end,
    status: "draft",
    employees: [],
    departments: [],
    positions: [],
    shifts: [],
    warnings: [],
    ...(error ? {} : {}),
  };
}

export async function getWeekBoard(weekStart: string): Promise<WeekBoard & { error: string | null }> {
  if (await isDemoSession()) {
    return { ...demoWeekBoard(weekStart), error: null };
  }

  const range = weekRange(weekStart);
  try {
    const supabase = await createClient();
    const [employeesResult, departmentsResult, positionsResult, shiftsResult, weekResult, availabilityResult, timeOffResult, vacationResult] =
      await Promise.all([
        supabase
          .from("employees")
          .select("id, profile_id, first_name, last_name, phone, email, avatar_url, department_id, position_id, is_active, notes, department:departments(id, name, color_token), position:positions(id, name)")
          .eq("is_active", true)
          .order("first_name"),
        supabase.from("departments").select("id, name, color_token, sort_order").order("sort_order"),
        supabase.from("positions").select("id, department_id, name, sort_order").order("sort_order"),
        supabase.from("shifts").select(shiftSelect).gte("shift_date", range.start).lte("shift_date", range.end).neq("status", "cancelled"),
        supabase.from("schedule_weeks").select("status").eq("week_start", range.start).maybeSingle(),
        supabase.from("employee_availability").select("id, employee_id, day_of_week, is_unavailable, start_time, end_time"),
        supabase.from("time_off_requests").select("id, employee_id, request_date, reason, status, created_at").eq("status", "approved"),
        supabase.from("vacation_requests").select("id, employee_id, start_date, end_date, note, status, created_at").eq("status", "approved"),
      ]);

    const failed = [employeesResult, departmentsResult, positionsResult, shiftsResult].find((result) => result.error);
    if (failed?.error) {
      return { ...emptyBoard(range.start, null), error: userFacingError(failed.error) };
    }

    const employees = ((employeesResult.data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      profile_id: (row.profile_id as string | null) ?? null,
      first_name: String(row.first_name),
      last_name: String(row.last_name ?? ""),
      phone: (row.phone as string | null) ?? null,
      email: (row.email as string | null) ?? null,
      avatar_url: (row.avatar_url as string | null) ?? null,
      department_id: (row.department_id as string | null) ?? null,
      position_id: (row.position_id as string | null) ?? null,
      is_active: Boolean(row.is_active),
      notes: (row.notes as string | null) ?? null,
      department: one(row.department as Employee["department"] | NonNullable<Employee["department"]>[]),
      position: one(row.position as Employee["position"] | NonNullable<Employee["position"]>[]),
    }));
    const shifts = ((shiftsResult.data ?? []) as Record<string, unknown>[]).map(mapShift);
    const timeOff = (timeOffResult.data ?? []) as TimeOffRow[];
    const vacations = (vacationResult.data ?? []) as VacationRow[];

    return {
      weekStart: range.start,
      weekEnd: range.end,
      status: weekResult.data?.status === "published" ? "published" : "draft",
      employees,
      departments: (departmentsResult.data ?? []) as Department[],
      positions: (positionsResult.data ?? []) as Position[],
      shifts,
      warnings: findScheduleWarnings({
        shifts,
        availability: availabilityResult.data ?? [],
        timeOff,
        vacations,
      }).filter((warning) => shifts.some((shift) => warning.id.includes(shift.id))),
      error: null,
    };
  } catch (error) {
    return { ...emptyBoard(range.start, null), error: userFacingError(error) };
  }
}

export async function getTimeOffRequests() {
  if (await isDemoSession()) {
    return { requests: demoListTimeOff(), error: null };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("time_off_requests")
    .select("id, employee_id, request_date, reason, status, created_at, employee:employees(first_name, last_name)")
    .order("created_at", { ascending: false });
  if (error) {
    return { requests: [], error: userFacingError(error) };
  }
  return {
    requests: ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      employee_id: String(row.employee_id),
      request_date: String(row.request_date),
      reason: (row.reason as string | null) ?? null,
      status: row.status as TimeOffRow["status"],
      created_at: String(row.created_at),
      employee: one(row.employee as TimeOffRow["employee"] | NonNullable<TimeOffRow["employee"]>[]),
    })),
    error: null,
  };
}

export async function getVacationRequests() {
  if (await isDemoSession()) {
    return { requests: demoListVacations(), error: null };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vacation_requests")
    .select("id, employee_id, start_date, end_date, note, status, created_at, employee:employees(first_name, last_name)")
    .order("created_at", { ascending: false });
  if (error) {
    return { requests: [], error: userFacingError(error) };
  }
  return {
    requests: ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      employee_id: String(row.employee_id),
      start_date: String(row.start_date),
      end_date: String(row.end_date),
      note: (row.note as string | null) ?? null,
      status: row.status as VacationRow["status"],
      created_at: String(row.created_at),
      employee: one(row.employee as VacationRow["employee"] | NonNullable<VacationRow["employee"]>[]),
    })),
    error: null,
  };
}

export async function getSwapRequests(): Promise<{ requests: SwapView[]; error: string | null }> {
  if (await isDemoSession()) {
    return { requests: demoListSwaps(), error: null };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shift_swap_requests")
    .select(
      "id, status, created_at, shift_id, requester_employee_id, target_employee_id, shift:shifts(shift_date, start_time, end_time), requester:employees!shift_swap_requests_requester_employee_id_fkey(first_name, last_name), target:employees!shift_swap_requests_target_employee_id_fkey(first_name, last_name)",
    )
    .order("created_at", { ascending: false });
  if (error) {
    return { requests: [], error: userFacingError(error) };
  }
  return {
    requests: ((data ?? []) as Record<string, unknown>[]).map((row) => {
      const shift = one(row.shift as { shift_date: string; start_time: string; end_time: string } | { shift_date: string; start_time: string; end_time: string }[]);
      const requester = one(row.requester as { first_name: string; last_name: string } | { first_name: string; last_name: string }[]);
      const target = one(row.target as { first_name: string; last_name: string } | { first_name: string; last_name: string }[]);
      return {
        id: String(row.id),
        status: row.status as SwapView["status"],
        created_at: String(row.created_at),
        shift_id: String(row.shift_id),
        shift_date: shift?.shift_date ?? "",
        start_time: shift?.start_time?.slice(0, 5) ?? "",
        end_time: shift?.end_time?.slice(0, 5) ?? "",
        requester_employee_id: String(row.requester_employee_id),
        target_employee_id: String(row.target_employee_id),
        requester_name: requester ? `${requester.first_name} ${requester.last_name}` : "თანამშრომელი",
        target_name: target ? `${target.first_name} ${target.last_name}` : "თანამშრომელი",
      };
    }),
    error: null,
  };
}

export async function getUpcomingShifts() {
  if (await isDemoSession()) {
    return { shifts: demoUpcomingShifts(), error: null };
  }
  const today = todayInTimeZone("Asia/Tbilisi");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shifts")
    .select(shiftSelect)
    .gte("shift_date", today)
    .neq("status", "cancelled")
    .order("shift_date")
    .order("start_time");
  if (error) {
    return { shifts: [], error: userFacingError(error) };
  }
  return { shifts: ((data ?? []) as Record<string, unknown>[]).map(mapShift), error: null };
}

export async function getAttendanceDay(date: string): Promise<{ lines: AttendanceLine[]; error: string | null }> {
  if (await isDemoSession()) {
    return { lines: demoAttendanceDay(date), error: null };
  }
  try {
    const supabase = await createClient();
    const [employeesResult, shiftsResult, attendanceResult] = await Promise.all([
      supabase
        .from("employees")
        .select("id, profile_id, first_name, last_name, phone, email, avatar_url, department_id, position_id, is_active, notes, department:departments(id, name, color_token), position:positions(id, name)")
        .eq("is_active", true)
        .order("first_name"),
      supabase.from("shifts").select("id, employee_id, start_time, end_time, status").eq("shift_date", date).neq("status", "cancelled"),
      supabase.from("attendance").select("id, employee_id, shift_id, attendance_date, scheduled_start, scheduled_end, actual_start, actual_end, status, notes").eq("attendance_date", date),
    ]);
    if (employeesResult.error) {
      return { lines: [], error: userFacingError(employeesResult.error) };
    }
    const shifts = (shiftsResult.data ?? []) as { id: string; employee_id: string; start_time: string; end_time: string }[];
    const attendance = (attendanceResult.data ?? []) as AttendanceLine["record"][];
    const lines = ((employeesResult.data ?? []) as Record<string, unknown>[]).map((row) => {
      const id = String(row.id);
      const shift = shifts.find((item) => item.employee_id === id);
      return {
        employee: {
          id,
          profile_id: (row.profile_id as string | null) ?? null,
          first_name: String(row.first_name),
          last_name: String(row.last_name ?? ""),
          phone: (row.phone as string | null) ?? null,
          email: (row.email as string | null) ?? null,
          avatar_url: (row.avatar_url as string | null) ?? null,
          department_id: (row.department_id as string | null) ?? null,
          position_id: (row.position_id as string | null) ?? null,
          is_active: true,
          notes: (row.notes as string | null) ?? null,
          department: one(row.department as Employee["department"] | NonNullable<Employee["department"]>[]),
          position: one(row.position as Employee["position"] | NonNullable<Employee["position"]>[]),
        },
        scheduledStart: shift?.start_time.slice(0, 5) ?? null,
        scheduledEnd: shift?.end_time.slice(0, 5) ?? null,
        shiftId: shift?.id ?? null,
        record: attendance.find((item) => item?.employee_id === id) ?? null,
      };
    });
    return { lines, error: null };
  } catch (error) {
    return { lines: [], error: userFacingError(error) };
  }
}

export async function getNotifications(): Promise<{ notifications: StoredNotification[]; error: string | null }> {
  if (await isDemoSession()) {
    return { notifications: demoListNotifications(), error: null };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("notifications").select("id, title, body, is_read, created_at").order("created_at", { ascending: false });
  if (error) {
    return { notifications: [], error: userFacingError(error) };
  }
  return { notifications: (data ?? []) as StoredNotification[], error: null };
}

export function shiftWeekStart(date: string) {
  return weekRange(date).start;
}

export function previousWeek(weekStart: string) {
  return addDays(weekRange(weekStart).start, -7);
}

export function nextWeek(weekStart: string) {
  return addDays(weekRange(weekStart).start, 7);
}
