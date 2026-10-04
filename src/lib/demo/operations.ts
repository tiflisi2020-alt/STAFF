import { randomUUID } from "node:crypto";
import { addDays, formatGeorgianDate, monthRange, todayInTimeZone, weekRange } from "@/lib/dates";
import { fullName } from "@/lib/format";
import { findScheduleWarnings, type ScheduleWarning } from "@/lib/scheduling/conflicts";
import type {
  AttendanceStatus,
  AvailabilityRow,
  Department,
  Employee,
  Position,
  RequestStatus,
  ShiftRow,
  SwapStatus,
} from "@/types/database";
import {
  loadDemoStore,
  saveDemoStore,
  type DemoStore,
  type StoredAttendance,
  type StoredShift,
} from "@/lib/demo/store";

export type WeekBoard = {
  weekStart: string;
  weekEnd: string;
  status: "draft" | "published";
  employees: Employee[];
  departments: Department[];
  positions: Position[];
  shifts: ShiftRow[];
  warnings: ScheduleWarning[];
};

export type SwapView = {
  id: string;
  status: SwapStatus;
  created_at: string;
  shift_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  requester_employee_id: string;
  target_employee_id: string;
  requester_name: string;
  target_name: string;
};

type DemoResult = { error?: string; success?: string; warnings?: string[] };

export type AttendanceLine = {
  employee: Employee;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  shiftId: string | null;
  record: StoredAttendance | null;
};

function personName(store: DemoStore, id: string) {
  const person = store.employees.find((item) => item.id === id);
  return person ? fullName(person) : "თანამშრომელი";
}

function toEmployee(store: DemoStore, person: DemoStore["employees"][number]): Employee {
  return {
    ...person,
    department: store.departments.find((department) => department.id === person.department_id) ?? null,
    position: store.positions.find((position) => position.id === person.position_id) ?? null,
  };
}

export function toShiftRow(store: DemoStore, shift: StoredShift): ShiftRow {
  const person = store.employees.find((item) => item.id === shift.employee_id);
  const position = store.positions.find((item) => item.id === shift.position_id);
  const department = store.departments.find((item) => item.id === shift.department_id);
  return {
    id: shift.id,
    employee_id: shift.employee_id,
    shift_date: shift.shift_date,
    start_time: shift.start_time.slice(0, 5),
    end_time: shift.end_time.slice(0, 5),
    status: shift.status,
    employee: person ? { id: person.id, first_name: person.first_name, last_name: person.last_name } : null,
    position: position ? { name: position.name } : null,
    department: department ? { name: department.name, color_token: department.color_token } : null,
  };
}

function collectWarnings(store: DemoStore) {
  return findScheduleWarnings({
    shifts: store.shifts.map((shift) => toShiftRow(store, shift)),
    availability: store.availability,
    timeOff: store.timeOff,
    vacations: store.vacations,
  });
}

function notify(store: DemoStore, title: string, body: string) {
  store.notifications.unshift({
    id: randomUUID(),
    title,
    body,
    is_read: false,
    created_at: new Date().toISOString(),
  });
}

export function demoUnreadCount() {
  return loadDemoStore().notifications.filter((item) => !item.is_read).length;
}

export function demoWeekBoard(weekStart: string): WeekBoard {
  const store = loadDemoStore();
  const range = weekRange(weekStart);
  const week = store.weeks.find((item) => item.week_start === range.start);
  const shifts = store.shifts
    .filter((shift) => shift.shift_date >= range.start && shift.shift_date <= range.end && shift.status !== "cancelled")
    .map((shift) => toShiftRow(store, shift))
    .sort((left, right) => left.shift_date.localeCompare(right.shift_date) || left.start_time.localeCompare(right.start_time));

  return {
    weekStart: range.start,
    weekEnd: range.end,
    status: week?.status ?? "draft",
    employees: store.employees.filter((item) => item.is_active).map((item) => toEmployee(store, item)),
    departments: store.departments,
    positions: store.positions,
    shifts,
    warnings: collectWarnings(store).filter((warning) => shifts.some((shift) => warning.id.includes(shift.id))),
  };
}

export function demoSaveShift(input: {
  id?: string;
  employeeId: string;
  departmentId: string;
  positionId: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  notes: string | null;
}) {
  const store = loadDemoStore();
  const person = store.employees.find((item) => item.id === input.employeeId && item.is_active);
  const position = store.positions.find((item) => item.id === input.positionId);
  if (!person) {
    return { error: "აირჩიეთ აქტიური თანამშრომელი." };
  }
  if (!position || position.department_id !== input.departmentId) {
    return { error: "პოზიცია არჩეულ განყოფილებას არ ეკუთვნის." };
  }
  if (input.startTime === input.endTime) {
    return { error: "დაწყება და დასრულება ერთი და იგივე ვერ იქნება." };
  }

  const next: StoredShift = {
    id: input.id ?? randomUUID(),
    employee_id: input.employeeId,
    department_id: input.departmentId,
    position_id: input.positionId,
    shift_date: input.shiftDate,
    start_time: input.startTime,
    end_time: input.endTime,
    break_minutes: input.breakMinutes,
    notes: input.notes,
    status: "draft",
  };

  if (input.id) {
    const index = store.shifts.findIndex((item) => item.id === input.id);
    if (index === -1) {
      return { error: "ცვლა ვერ მოიძებნა." };
    }
    next.status = store.shifts[index].status === "cancelled" ? "draft" : store.shifts[index].status;
    store.shifts[index] = next;
  } else {
    store.shifts.push(next);
  }

  saveDemoStore(store);
  const warnings = collectWarnings(store).filter((warning) => warning.id.includes(next.id));
  return {
    success: input.id ? "ცვლა განახლდა." : "ცვლა დაემატა.",
    warnings: warnings.map((warning) => warning.message),
  };
}

export function demoDeleteShift(id: string) {
  const store = loadDemoStore();
  if (!store.shifts.some((item) => item.id === id)) {
    return { error: "ცვლა ვერ მოიძებნა." };
  }
  store.shifts = store.shifts.filter((item) => item.id !== id);
  store.swaps = store.swaps.filter((item) => item.shift_id !== id || item.status === "approved");
  saveDemoStore(store);
  return { success: "ცვლა წაიშალა." };
}

export function demoMoveShift(id: string, employeeId: string, shiftDate: string) {
  const store = loadDemoStore();
  const shift = store.shifts.find((item) => item.id === id);
  const person = store.employees.find((item) => item.id === employeeId && item.is_active);
  if (!shift || !person || !person.department_id || !person.position_id) {
    return { error: "ცვლის გადატანა ვერ მოხერხდა." };
  }
  shift.employee_id = employeeId;
  shift.department_id = person.department_id;
  shift.position_id = person.position_id;
  shift.shift_date = shiftDate;
  saveDemoStore(store);
  const warnings = collectWarnings(store).filter((warning) => warning.id.includes(shift.id));
  return { success: "ცვლა გადავიდა.", warnings: warnings.map((warning) => warning.message) };
}

export function demoPublishWeek(weekStart: string): DemoResult {
  const store = loadDemoStore();
  const range = weekRange(weekStart);
  const existing = store.weeks.find((item) => item.week_start === range.start);
  if (existing) {
    existing.status = "published";
  } else {
    store.weeks.push({ week_start: range.start, status: "published" });
  }
  for (const shift of store.shifts) {
    if (shift.shift_date >= range.start && shift.shift_date <= range.end && shift.status === "draft") {
      shift.status = "published";
    }
  }
  notify(store, "გრაფიკი გამოქვეყნდა", `${formatGeorgianDate(range.start)}-დან კვირის გრაფიკი გამოქვეყნდა.`);
  saveDemoStore(store);
  return { success: "კვირა გამოქვეყნდა." };
}

export function demoCopyPreviousWeek(weekStart: string, mode: "merge" | "replace"): DemoResult {
  const store = loadDemoStore();
  const range = weekRange(weekStart);
  const previousStart = addDays(range.start, -7);
  const previousEnd = addDays(previousStart, 6);
  const source = store.shifts.filter(
    (shift) => shift.shift_date >= previousStart && shift.shift_date <= previousEnd && shift.status !== "cancelled",
  );
  if (source.length === 0) {
    return { error: "წინა კვირაში ცვლები არ არის." };
  }
  if (mode === "replace") {
    const ids = new Set(
      store.shifts
        .filter((shift) => shift.shift_date >= range.start && shift.shift_date <= range.end)
        .map((shift) => shift.id),
    );
    store.shifts = store.shifts.filter((shift) => !ids.has(shift.id));
    store.swaps = store.swaps.filter((swap) => !ids.has(swap.shift_id) || swap.status === "approved");
  }

  let copied = 0;
  for (const shift of source) {
    const date = addDays(shift.shift_date, 7);
    const exists = store.shifts.some(
      (item) =>
        item.employee_id === shift.employee_id &&
        item.shift_date === date &&
        item.start_time === shift.start_time &&
        item.end_time === shift.end_time &&
        item.status !== "cancelled",
    );
    if (mode === "merge" && exists) {
      continue;
    }
    store.shifts.push({ ...shift, id: randomUUID(), shift_date: date, status: "draft" });
    copied += 1;
  }
  saveDemoStore(store);
  return { success: copied > 0 ? `დაკოპირდა ${copied} ცვლა.` : "ახალი ცვლა არ დაემატა. იგივე ცვლები უკვე არის." };
}

export function demoListTimeOff() {
  const store = loadDemoStore();
  return store.timeOff
    .map((item) => ({
      ...item,
      employee: store.employees.find((person) => person.id === item.employee_id) ?? null,
    }))
    .sort((left, right) => right.created_at.localeCompare(left.created_at));
}

export function demoCreateTimeOff(input: { employeeId: string; date: string; reason: string | null }) {
  const store = loadDemoStore();
  if (!store.employees.some((item) => item.id === input.employeeId)) {
    return { error: "აირჩიეთ თანამშრომელი." };
  }
  store.timeOff.unshift({
    id: randomUUID(),
    employee_id: input.employeeId,
    request_date: input.date,
    reason: input.reason,
    status: "pending",
    created_at: new Date().toISOString(),
  });
  notify(store, "ახალი დასვენების მოთხოვნა", `${personName(store, input.employeeId)} ითხოვს დასვენებას ${formatGeorgianDate(input.date)}ს.`);
  saveDemoStore(store);
  return { success: "მოთხოვნა გაიგზავნა." };
}

export function demoReviewTimeOff(id: string, status: Extract<RequestStatus, "approved" | "rejected">) {
  const store = loadDemoStore();
  const request = store.timeOff.find((item) => item.id === id);
  if (!request || request.status !== "pending") {
    return { error: "მოთხოვნა ვერ მოიძებნა." };
  }
  request.status = status;
  notify(
    store,
    status === "approved" ? "დასვენება დადასტურდა" : "დასვენება უარყოფილია",
    `${personName(store, request.employee_id)} · ${formatGeorgianDate(request.request_date)}`,
  );
  saveDemoStore(store);
  return { success: status === "approved" ? "მოთხოვნა დადასტურდა." : "მოთხოვნა უარყოფილია." };
}

export function demoListVacations() {
  const store = loadDemoStore();
  return store.vacations
    .map((item) => ({
      ...item,
      employee: store.employees.find((person) => person.id === item.employee_id) ?? null,
    }))
    .sort((left, right) => right.created_at.localeCompare(left.created_at));
}

export function demoCreateVacation(input: { employeeId: string; startDate: string; endDate: string; note: string | null }) {
  const store = loadDemoStore();
  if (!store.employees.some((item) => item.id === input.employeeId)) {
    return { error: "აირჩიეთ თანამშრომელი." };
  }
  if (input.endDate < input.startDate) {
    return { error: "დასრულება დაწყებაზე ადრე ვერ იქნება." };
  }
  const overlaps = store.vacations.some(
    (item) =>
      item.employee_id === input.employeeId &&
      item.status !== "rejected" &&
      item.start_date <= input.endDate &&
      item.end_date >= input.startDate,
  );
  if (overlaps) {
    return { error: "ამ პერიოდში შვებულების მოთხოვნა უკვე არსებობს." };
  }
  store.vacations.unshift({
    id: randomUUID(),
    employee_id: input.employeeId,
    start_date: input.startDate,
    end_date: input.endDate,
    note: input.note,
    status: "pending",
    created_at: new Date().toISOString(),
  });
  notify(store, "ახალი შვებულების მოთხოვნა", personName(store, input.employeeId));
  saveDemoStore(store);
  return { success: "მოთხოვნა გაიგზავნა." };
}

export function demoReviewVacation(id: string, status: Extract<RequestStatus, "approved" | "rejected">) {
  const store = loadDemoStore();
  const request = store.vacations.find((item) => item.id === id);
  if (!request || request.status !== "pending") {
    return { error: "მოთხოვნა ვერ მოიძებნა." };
  }
  request.status = status;
  notify(
    store,
    status === "approved" ? "შვებულება დადასტურდა" : "შვებულება უარყოფილია",
    `${personName(store, request.employee_id)} · ${formatGeorgianDate(request.start_date)} – ${formatGeorgianDate(request.end_date)}`,
  );
  saveDemoStore(store);
  return { success: status === "approved" ? "მოთხოვნა დადასტურდა." : "მოთხოვნა უარყოფილია." };
}

export function demoListSwaps(): SwapView[] {
  const store = loadDemoStore();
  return store.swaps
    .map((swap) => {
      const shift = store.shifts.find((item) => item.id === swap.shift_id);
      return {
        id: swap.id,
        status: swap.status,
        created_at: swap.created_at,
        shift_id: swap.shift_id,
        shift_date: shift?.shift_date ?? "",
        start_time: shift?.start_time.slice(0, 5) ?? "",
        end_time: shift?.end_time.slice(0, 5) ?? "",
        requester_employee_id: swap.requester_employee_id,
        target_employee_id: swap.target_employee_id,
        requester_name: personName(store, swap.requester_employee_id),
        target_name: personName(store, swap.target_employee_id),
      };
    })
    .sort((left, right) => right.created_at.localeCompare(left.created_at));
}

export function demoCreateSwap(input: { shiftId: string; targetEmployeeId: string }) {
  const store = loadDemoStore();
  const shift = store.shifts.find((item) => item.id === input.shiftId && item.status !== "cancelled");
  const target = store.employees.find((item) => item.id === input.targetEmployeeId && item.is_active);
  if (!shift || !target) {
    return { error: "აირჩიეთ ცვლა და მიმღები თანამშრომელი." };
  }
  if (shift.employee_id === target.id) {
    return { error: "ცვლა საკუთარ თავზე ვერ გადაეცემა." };
  }
  const open = store.swaps.some(
    (item) => item.shift_id === shift.id && (item.status === "pending_peer" || item.status === "pending_manager"),
  );
  if (open) {
    return { error: "ამ ცვლაზე გაცვლა უკვე მოლოდინშია." };
  }
  store.swaps.unshift({
    id: randomUUID(),
    shift_id: shift.id,
    requester_employee_id: shift.employee_id,
    target_employee_id: target.id,
    status: "pending_peer",
    created_at: new Date().toISOString(),
  });
  notify(store, "ცვლის გაცვლის მოთხოვნა", `${personName(store, shift.employee_id)} → ${fullName(target)}`);
  saveDemoStore(store);
  return { success: "გაცვლის მოთხოვნა გაიგზავნა." };
}

export function demoRespondSwap(id: string, accept: boolean) {
  const store = loadDemoStore();
  const swap = store.swaps.find((item) => item.id === id);
  if (!swap || swap.status !== "pending_peer") {
    return { error: "მოთხოვნა ამ ეტაპზე აღარ არის." };
  }
  swap.status = accept ? "pending_manager" : "peer_rejected";
  notify(store, accept ? "გაცვლა მენეჯერთანაა" : "გაცვლა უარყოფილია", personName(store, swap.target_employee_id));
  saveDemoStore(store);
  return { success: accept ? "მიმღებმა დაადასტურა. ელოდება მენეჯერს." : "მიმღებმა უარი თქვა." };
}

export function demoReviewSwap(id: string, approve: boolean) {
  const store = loadDemoStore();
  const swap = store.swaps.find((item) => item.id === id);
  const shift = swap ? store.shifts.find((item) => item.id === swap.shift_id) : undefined;
  const target = swap ? store.employees.find((item) => item.id === swap.target_employee_id) : undefined;
  if (!swap || !shift || swap.status !== "pending_manager") {
    return { error: "მოთხოვნა ამ ეტაპზე აღარ არის." };
  }
  if (approve) {
    if (!target?.department_id || !target.position_id) {
      return { error: "მიმღებს განყოფილება ან პოზიცია აკლია." };
    }
    shift.employee_id = target.id;
    shift.department_id = target.department_id;
    shift.position_id = target.position_id;
    swap.status = "approved";
  } else {
    swap.status = "rejected";
  }
  notify(store, approve ? "ცვლის გაცვლა დადასტურდა" : "ცვლის გაცვლა უარყოფილია", personName(store, swap.requester_employee_id));
  saveDemoStore(store);
  return { success: approve ? "გაცვლა დადასტურდა და ცვლა გადავიდა." : "გაცვლა უარყოფილია." };
}

export function demoAttendanceDay(date: string): AttendanceLine[] {
  const store = loadDemoStore();
  return store.employees
    .filter((item) => item.is_active)
    .map((person) => {
      const shift = store.shifts.find(
        (item) => item.employee_id === person.id && item.shift_date === date && item.status !== "cancelled",
      );
      const record =
        store.attendance.find((item) => item.employee_id === person.id && item.attendance_date === date) ?? null;
      return {
        employee: toEmployee(store, person),
        scheduledStart: shift?.start_time.slice(0, 5) ?? null,
        scheduledEnd: shift?.end_time.slice(0, 5) ?? null,
        shiftId: shift?.id ?? null,
        record,
      };
    })
    .sort((left, right) => left.employee.first_name.localeCompare(right.employee.first_name, "ka"));
}

export function demoSaveAttendance(input: {
  employeeId: string;
  date: string;
  actualStart: string | null;
  actualEnd: string | null;
  status: AttendanceStatus;
  notes: string | null;
}) {
  const store = loadDemoStore();
  const person = store.employees.find((item) => item.id === input.employeeId);
  if (!person) {
    return { error: "თანამშრომელი ვერ მოიძებნა." };
  }
  const shift = store.shifts.find(
    (item) => item.employee_id === input.employeeId && item.shift_date === input.date && item.status !== "cancelled",
  );
  const existing = store.attendance.find(
    (item) => item.employee_id === input.employeeId && item.attendance_date === input.date,
  );
  const next: StoredAttendance = {
    id: existing?.id ?? randomUUID(),
    employee_id: input.employeeId,
    shift_id: shift?.id ?? null,
    attendance_date: input.date,
    scheduled_start: shift?.start_time ?? null,
    scheduled_end: shift?.end_time ?? null,
    actual_start: input.actualStart,
    actual_end: input.actualEnd,
    status: input.status,
    notes: input.notes,
  };
  if (existing) {
    Object.assign(existing, next);
  } else {
    store.attendance.push(next);
  }
  saveDemoStore(store);
  return { success: "დასწრება შეინახა." };
}

export function demoListNotifications() {
  return loadDemoStore().notifications;
}

export function demoMarkNotificationsRead(id?: string): DemoResult {
  const store = loadDemoStore();
  for (const item of store.notifications) {
    if (!id || item.id === id) {
      item.is_read = true;
    }
  }
  saveDemoStore(store);
  return { success: "შეტყობინება წაკითხულად მოინიშნა." };
}

export function demoSaveAvailability(
  employeeId: string,
  rows: { day: number; unavailable: boolean; start: string; end: string }[],
) {
  const store = loadDemoStore();
  if (!store.employees.some((item) => item.id === employeeId)) {
    return { error: "თანამშრომელი ვერ მოიძებნა." };
  }
  store.availability = store.availability.filter((item) => item.employee_id !== employeeId);
  for (const row of rows) {
    if (!row.unavailable && row.start === row.end) {
      return { error: "ხელმისაწვდომობის დაწყება და დასრულება ერთი და იგივე ვერ იქნება." };
    }
    store.availability.push({
      id: randomUUID(),
      employee_id: employeeId,
      day_of_week: row.day,
      is_unavailable: row.unavailable,
      start_time: row.unavailable ? null : row.start,
      end_time: row.unavailable ? null : row.end,
    });
  }
  saveDemoStore(store);
  return { success: "ხელმისაწვდომობა შეინახა." };
}

export function demoDashboard(timeZone: string) {
  const store = loadDemoStore();
  const today = todayInTimeZone(timeZone);
  const shifts = store.shifts
    .filter((shift) => shift.shift_date === today && shift.status !== "cancelled")
    .map((shift) => toShiftRow(store, shift));
  const working = new Set(shifts.map((shift) => shift.employee_id));
  const off = new Set<string>();
  for (const request of store.timeOff) {
    if (request.status === "approved" && request.request_date === today) {
      off.add(request.employee_id);
    }
  }
  for (const request of store.vacations) {
    if (request.status === "approved" && request.start_date <= today && request.end_date >= today) {
      off.add(request.employee_id);
    }
  }
  const allRequests = [
    ...store.timeOff.map((item) => ({
      id: item.id,
      kind: "time_off" as const,
      label: "დასვენება",
      person: personName(store, item.employee_id),
      detail: item.request_date,
      status: item.status,
      created_at: item.created_at,
    })),
    ...store.vacations.map((item) => ({
      id: item.id,
      kind: "vacation" as const,
      label: "შვებულება",
      person: personName(store, item.employee_id),
      detail: `${item.start_date} – ${item.end_date}`,
      status: item.status,
      created_at: item.created_at,
    })),
    ...store.swaps.map((item) => ({
      id: item.id,
      kind: "swap" as const,
      label: "გაცვლა",
      person: personName(store, item.requester_employee_id),
      detail: personName(store, item.target_employee_id),
      status: item.status,
      created_at: item.created_at,
    })),
  ].sort((left, right) => right.created_at.localeCompare(left.created_at));
  const requests = allRequests.slice(0, 6);
  const pending = allRequests.filter((item) =>
    ["pending", "pending_peer", "pending_manager"].includes(item.status),
  ).length;

  return {
    employeeCount: store.employees.filter((item) => item.is_active).length,
    workingToday: working.size,
    offToday: off.size,
    requestCount: pending,
    shifts,
    warnings: collectWarnings(store).slice(0, 6),
    requests,
    error: null,
  };
}

export function demoProfileSchedule(employeeId: string, timeZone: string) {
  const store = loadDemoStore();
  const today = todayInTimeZone(timeZone);
  const week = weekRange(today);
  const month = monthRange(today);
  const attendance = { present: 0, late: 0, absent: 0, day_off: 0, vacation: 0 };
  for (const row of store.attendance) {
    if (row.employee_id === employeeId && row.attendance_date >= month.start && row.attendance_date <= month.end) {
      attendance[row.status] += 1;
    }
  }
  return {
    shifts: store.shifts
      .filter(
        (shift) =>
          shift.employee_id === employeeId &&
          shift.shift_date >= week.start &&
          shift.shift_date <= week.end &&
          shift.status !== "cancelled",
      )
      .map((shift) => toShiftRow(store, shift)),
    availability: store.availability.filter((item) => item.employee_id === employeeId) satisfies AvailabilityRow[],
    timeOff: store.timeOff.filter(
      (item) => item.employee_id === employeeId && item.request_date >= today && item.status !== "rejected",
    ),
    vacations: store.vacations.filter(
      (item) => item.employee_id === employeeId && item.end_date >= today && item.status !== "rejected",
    ),
    attendance,
    weekStart: week.start,
    weekEnd: week.end,
    error: null,
  };
}

export function demoUpcomingShifts() {
  const store = loadDemoStore();
  const today = todayInTimeZone("Asia/Tbilisi");
  return store.shifts
    .filter((shift) => shift.shift_date >= today && shift.status !== "cancelled")
    .map((shift) => toShiftRow(store, shift))
    .sort((left, right) => left.shift_date.localeCompare(right.shift_date) || left.start_time.localeCompare(right.start_time));
}
