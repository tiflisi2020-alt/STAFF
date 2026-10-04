import { addDays, formatGeorgianDate, isoWeekday } from "@/lib/dates";
import { formatShiftHours, fullName } from "@/lib/format";
import { intervalContains, intervalsOverlap, toInterval } from "@/lib/scheduling/time";
import type { AvailabilityRow, ShiftRow, TimeOffRow, VacationRow } from "@/types/database";

export type ScheduleWarning = {
  id: string;
  message: string;
};

type ConflictInput = {
  shifts: ShiftRow[];
  availability: AvailabilityRow[];
  timeOff: TimeOffRow[];
  vacations: VacationRow[];
};

export function findScheduleWarnings({
  shifts,
  availability,
  timeOff,
  vacations,
}: ConflictInput): ScheduleWarning[] {
  const warnings: ScheduleWarning[] = [];
  const active = shifts.filter((shift) => shift.status !== "cancelled" && shift.employee);

  for (const shift of active) {
    const interval = toInterval(shift.start_time, shift.end_time);
    const name = fullName(shift.employee!);
    const dateLabel = formatGeorgianDate(shift.shift_date);

    if (!interval) {
      warnings.push({
        id: `invalid-${shift.id}`,
        message: `${name}ს ${dateLabel}ს ცვლას არასწორი დრო აქვს.`,
      });
      continue;
    }

    const related = active.filter(
      (other) => other.id !== shift.id && other.employee_id === shift.employee_id,
    );

    for (const other of related) {
      if (shift.id > other.id) {
        continue;
      }
      const otherInterval = toInterval(other.start_time, other.end_time);
      if (!otherInterval || !shiftsOverlap(shift, interval, other, otherInterval)) {
        continue;
      }
      warnings.push({
        id: `overlap-${shift.id}-${other.id}`,
        message: `${name}ს ${dateLabel}ს ერთდროულად ორი ცვლა აქვს: ${formatShiftHours(shift.start_time, shift.end_time)} და ${formatShiftHours(other.start_time, other.end_time)}.`,
      });
    }

    const day = isoWeekday(shift.shift_date);
    const dayAvailability = availability.filter(
      (item) => item.employee_id === shift.employee_id && item.day_of_week === day,
    );
    const windows = dayAvailability.filter((item) => !item.is_unavailable && item.start_time && item.end_time);
    const unavailable = dayAvailability.some((item) => item.is_unavailable);

    if (dayAvailability.length > 0 && windows.length === 0 && unavailable) {
      warnings.push({
        id: `unavailable-${shift.id}`,
        message: `${name} ${dateLabel}ს მიუწვდომელია.`,
      });
    } else if (windows.length > 0) {
      const fits = windows.some((window) => {
        const available = toInterval(window.start_time!, window.end_time!);
        return available ? intervalContains(available, interval) : false;
      });
      if (!fits) {
        warnings.push({
          id: `window-${shift.id}`,
          message: `${name}ს ცვლა ${dateLabel}ს, ${formatShiftHours(shift.start_time, shift.end_time)}, ხელმისაწვდომობას სცდება.`,
        });
      }
    }

    const off = timeOff.find(
      (request) =>
        request.employee_id === shift.employee_id &&
        request.status === "approved" &&
        request.request_date === shift.shift_date,
    );
    if (off) {
      warnings.push({
        id: `off-${shift.id}`,
        message: `${name}ს ${dateLabel}ს დამტკიცებული დასვენების დღე აქვს.`,
      });
    }

    const vacation = vacations.find(
      (request) =>
        request.employee_id === shift.employee_id &&
        request.status === "approved" &&
        request.start_date <= shift.shift_date &&
        request.end_date >= shift.shift_date,
    );
    if (vacation) {
      warnings.push({
        id: `vacation-${shift.id}`,
        message: `${name}ს ცვლა ${dateLabel}ს ემთხვევა შვებულებას.`,
      });
    }
  }

  return warnings;
}

function shiftsOverlap(
  leftShift: ShiftRow,
  left: NonNullable<ReturnType<typeof toInterval>>,
  rightShift: ShiftRow,
  right: NonNullable<ReturnType<typeof toInterval>>,
) {
  if (leftShift.shift_date === rightShift.shift_date) {
    return intervalsOverlap(left, right);
  }

  const earlierShift = leftShift.shift_date < rightShift.shift_date ? leftShift : rightShift;
  const earlier = leftShift.shift_date < rightShift.shift_date ? left : right;
  const later = leftShift.shift_date < rightShift.shift_date ? right : left;
  const laterShift = leftShift.shift_date < rightShift.shift_date ? rightShift : leftShift;

  if (addDays(earlierShift.shift_date, 1) !== laterShift.shift_date || earlier.end <= 24 * 60) {
    return false;
  }

  return intervalsOverlap({ start: 0, end: earlier.end - 24 * 60 }, later);
}
