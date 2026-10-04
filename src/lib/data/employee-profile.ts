import { isDemoSession } from "@/lib/demo/session";
import { demoProfileSchedule } from "@/lib/demo/operations";
import { eachDate, monthRange, todayInTimeZone, weekRange } from "@/lib/dates";
import { one } from "@/lib/data/relations";
import { userFacingError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { AttendanceStatus, AvailabilityRow, ShiftRow, TimeOffRow, VacationRow } from "@/types/database";

const shiftSelect = `
  id, employee_id, shift_date, start_time, end_time, status,
  employee:employees(id, first_name, last_name),
  position:positions(name),
  department:departments(name, color_token)
`;

export type ProfileSchedule = {
  shifts: ShiftRow[];
  availability: AvailabilityRow[];
  timeOff: TimeOffRow[];
  vacations: VacationRow[];
  attendance: Record<AttendanceStatus, number>;
  weekStart: string;
  weekEnd: string;
  error: string | null;
};

export async function getEmployeeSchedule(employeeId: string, timeZone: string): Promise<ProfileSchedule> {
  const today = todayInTimeZone(timeZone);
  const week = weekRange(today);

  if (await isDemoSession()) {
    return demoProfileSchedule(employeeId, timeZone);
  }

  const month = monthRange(today);
  const supabase = await createClient();

  const [shiftsResult, availabilityResult, timeOffResult, vacationResult, attendanceResult] = await Promise.all([
    supabase
      .from("shifts")
      .select(shiftSelect)
      .eq("employee_id", employeeId)
      .gte("shift_date", week.start)
      .lte("shift_date", week.end)
      .neq("status", "cancelled")
      .order("shift_date")
      .order("start_time"),
    supabase
      .from("employee_availability")
      .select("id, employee_id, day_of_week, is_unavailable, start_time, end_time")
      .eq("employee_id", employeeId)
      .order("day_of_week")
      .order("start_time"),
    supabase
      .from("time_off_requests")
      .select("id, employee_id, request_date, reason, status, created_at")
      .eq("employee_id", employeeId)
      .gte("request_date", today)
      .in("status", ["pending", "approved"])
      .order("request_date"),
    supabase
      .from("vacation_requests")
      .select("id, employee_id, start_date, end_date, note, status, created_at")
      .eq("employee_id", employeeId)
      .gte("end_date", today)
      .in("status", ["pending", "approved"])
      .order("start_date"),
    supabase
      .from("attendance")
      .select("status")
      .eq("employee_id", employeeId)
      .gte("attendance_date", month.start)
      .lte("attendance_date", month.end),
  ]);

  const firstError =
    shiftsResult.error || availabilityResult.error || timeOffResult.error || vacationResult.error || attendanceResult.error;

  const attendance: Record<AttendanceStatus, number> = {
    present: 0,
    late: 0,
    absent: 0,
    day_off: 0,
    vacation: 0,
  };

  for (const row of attendanceResult.data ?? []) {
    const status = row.status as AttendanceStatus;
    if (status in attendance) {
      attendance[status] += 1;
    }
  }

  return {
    shifts: ((shiftsResult.data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      employee_id: String(row.employee_id),
      shift_date: String(row.shift_date),
      start_time: String(row.start_time),
      end_time: String(row.end_time),
      status: row.status as ShiftRow["status"],
      employee: one(row.employee as ShiftRow["employee"]),
      position: one(row.position as ShiftRow["position"]),
      department: one(row.department as ShiftRow["department"]),
    })),
    availability: (availabilityResult.data ?? []) as AvailabilityRow[],
    timeOff: (timeOffResult.data ?? []) as TimeOffRow[],
    vacations: (vacationResult.data ?? []) as VacationRow[],
    attendance,
    weekStart: week.start,
    weekEnd: week.end,
    error: firstError ? userFacingError(firstError) : null,
  };
}

export function weekDays(start: string, end: string) {
  return eachDate(start, end);
}
