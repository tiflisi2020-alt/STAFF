import { toInterval } from "@/lib/scheduling/time";
import type { ShiftRow } from "@/types/database";

export type WorkStatRow = {
  id: string;
  name: string;
  detail: string;
  minutes: number;
  shifts: number;
  colorToken: string | null;
};

export function shiftMinutes(shift: Pick<ShiftRow, "start_time" | "end_time">) {
  const interval = toInterval(shift.start_time, shift.end_time);
  if (!interval) {
    return 0;
  }
  return interval.end - interval.start;
}

export function summarizeWork(shifts: ShiftRow[]) {
  const active = shifts.filter((shift) => shift.status !== "cancelled");
  const employees = new Map<string, WorkStatRow>();
  const departments = new Map<string, WorkStatRow>();

  for (const shift of active) {
    const minutes = shiftMinutes(shift);
    const employeeId = shift.employee_id;
    const employeeName = shift.employee ? `${shift.employee.first_name} ${shift.employee.last_name}`.trim() : "თანამშრომელი";
    const currentEmployee = employees.get(employeeId) ?? {
      id: employeeId,
      name: employeeName,
      detail: shift.position?.name ?? "",
      minutes: 0,
      shifts: 0,
      colorToken: shift.department?.color_token ?? null,
    };
    currentEmployee.minutes += minutes;
    currentEmployee.shifts += 1;
    employees.set(employeeId, currentEmployee);

    const departmentName = shift.department?.name ?? "განყოფილების გარეშე";
    const departmentKey = shift.department?.color_token ?? departmentName;
    const currentDepartment = departments.get(departmentKey) ?? {
      id: departmentKey,
      name: departmentName,
      detail: "",
      minutes: 0,
      shifts: 0,
      colorToken: shift.department?.color_token ?? null,
    };
    currentDepartment.minutes += minutes;
    currentDepartment.shifts += 1;
    departments.set(departmentKey, currentDepartment);
  }

  const byMinutes = (left: WorkStatRow, right: WorkStatRow) => right.minutes - left.minutes || left.name.localeCompare(right.name, "ka");

  return {
    totalMinutes: active.reduce((sum, shift) => sum + shiftMinutes(shift), 0),
    shiftCount: active.length,
    byEmployee: [...employees.values()].sort(byMinutes),
    byDepartment: [...departments.values()].sort(byMinutes),
  };
}
