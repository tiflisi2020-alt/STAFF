import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { addDays, todayInTimeZone, weekRange } from "@/lib/dates";
import type {
  AttendanceStatus,
  AvailabilityRow,
  Department,
  Employee,
  Position,
  RequestStatus,
  ShiftStatus,
  SwapStatus,
} from "@/types/database";

type StoredEmployee = Omit<Employee, "department" | "position">;

export type StoredShift = {
  id: string;
  employee_id: string;
  department_id: string;
  position_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  notes: string | null;
  status: ShiftStatus;
};

export type StoredWeek = {
  week_start: string;
  status: "draft" | "published";
};

export type StoredTimeOff = {
  id: string;
  employee_id: string;
  request_date: string;
  reason: string | null;
  status: RequestStatus;
  created_at: string;
};

export type StoredVacation = {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  note: string | null;
  status: RequestStatus;
  created_at: string;
};

export type StoredSwap = {
  id: string;
  shift_id: string;
  requester_employee_id: string;
  target_employee_id: string;
  status: SwapStatus;
  created_at: string;
};

export type StoredAttendance = {
  id: string;
  employee_id: string;
  shift_id: string | null;
  attendance_date: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  status: AttendanceStatus;
  notes: string | null;
};

export type StoredNotification = {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  employee_id?: string | null;
};

export type StoredTemplateShift = {
  employee_id: string;
  department_id: string;
  position_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  break_minutes: number;
};

export type StoredTemplate = {
  id: string;
  name: string;
  shifts: StoredTemplateShift[];
};

export type StoredPushSubscription = {
  id: string;
  employee_id: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type DemoStore = {
  restaurantName: string;
  departments: Department[];
  positions: Position[];
  employees: StoredEmployee[];
  availability: AvailabilityRow[];
  shifts: StoredShift[];
  weeks: StoredWeek[];
  timeOff: StoredTimeOff[];
  vacations: StoredVacation[];
  swaps: StoredSwap[];
  attendance: StoredAttendance[];
  notifications: StoredNotification[];
  templates: StoredTemplate[];
  pushSubscriptions: StoredPushSubscription[];
  reminded: string[];
};

const initialStore: DemoStore = {
  restaurantName: "თიფლისი",
  departments: [
    { id: "22222222-2222-4222-8222-222222222201", name: "სამზარეულო", color_token: "kitchen", sort_order: 1 },
    { id: "22222222-2222-4222-8222-222222222202", name: "დარბაზი", color_token: "hall", sort_order: 2 },
    { id: "22222222-2222-4222-8222-222222222203", name: "ბარი", color_token: "bar", sort_order: 3 },
    { id: "22222222-2222-4222-8222-222222222204", name: "ადმინისტრაცია", color_token: "office", sort_order: 4 },
  ],
  positions: [
    { id: "33333333-3333-4333-8333-333333333301", department_id: "22222222-2222-4222-8222-222222222201", name: "შეფ-მზარეული", sort_order: 1 },
    { id: "33333333-3333-4333-8333-333333333302", department_id: "22222222-2222-4222-8222-222222222201", name: "სუს-შეფი", sort_order: 2 },
    { id: "33333333-3333-4333-8333-333333333303", department_id: "22222222-2222-4222-8222-222222222201", name: "მზარეული", sort_order: 3 },
    { id: "33333333-3333-4333-8333-333333333304", department_id: "22222222-2222-4222-8222-222222222201", name: "დამხმარე მზარეული", sort_order: 4 },
    { id: "33333333-3333-4333-8333-333333333305", department_id: "22222222-2222-4222-8222-222222222201", name: "ცივი კერძების მზარეული", sort_order: 5 },
    { id: "33333333-3333-4333-8333-333333333306", department_id: "22222222-2222-4222-8222-222222222201", name: "ჭურჭლის მრეცხავი", sort_order: 6 },
    { id: "33333333-3333-4333-8333-333333333311", department_id: "22222222-2222-4222-8222-222222222202", name: "მენეჯერი", sort_order: 1 },
    { id: "33333333-3333-4333-8333-333333333312", department_id: "22222222-2222-4222-8222-222222222202", name: "ოფიციანტი", sort_order: 2 },
    { id: "33333333-3333-4333-8333-333333333313", department_id: "22222222-2222-4222-8222-222222222202", name: "ჰოსტი", sort_order: 3 },
    { id: "33333333-3333-4333-8333-333333333314", department_id: "22222222-2222-4222-8222-222222222202", name: "რანერი", sort_order: 4 },
    { id: "33333333-3333-4333-8333-333333333321", department_id: "22222222-2222-4222-8222-222222222203", name: "ბარმენი", sort_order: 1 },
    { id: "33333333-3333-4333-8333-333333333331", department_id: "22222222-2222-4222-8222-222222222204", name: "ადმინისტრატორი", sort_order: 1 },
  ],
  employees: [
    employee("44444444-4444-4444-8444-444444444401", "ნინო", "გიორგაძე", "+995555000001", "nino.giorgadze@demo.invalid", "22222222-2222-4222-8222-222222222202", "33333333-3333-4333-8333-333333333312"),
    employee("44444444-4444-4444-8444-444444444402", "გიორგი", "ბერიძე", "+995555000002", "giorgi.beridze@demo.invalid", "22222222-2222-4222-8222-222222222201", "33333333-3333-4333-8333-333333333303"),
    employee("44444444-4444-4444-8444-444444444403", "მარიამ", "კაპანაძე", "+995555000003", "mariam.kapanadze@demo.invalid", "22222222-2222-4222-8222-222222222203", "33333333-3333-4333-8333-333333333321"),
    employee("44444444-4444-4444-8444-444444444404", "ლუკა", "ნადირაძე", "+995555000004", "luka.nadiradze@demo.invalid", "22222222-2222-4222-8222-222222222202", "33333333-3333-4333-8333-333333333311"),
  ],
  availability: [
    window("44444444-4444-4444-8444-444444444401", 1, false, "10:00", "22:00"),
    window("44444444-4444-4444-8444-444444444401", 2, false, "10:00", "22:00"),
    window("44444444-4444-4444-8444-444444444401", 3, true, null, null),
    window("44444444-4444-4444-8444-444444444401", 4, false, "16:00", "00:00"),
    window("44444444-4444-4444-8444-444444444401", 5, false, "10:00", "22:00"),
    window("44444444-4444-4444-8444-444444444401", 6, false, "10:00", "22:00"),
    window("44444444-4444-4444-8444-444444444401", 7, false, "10:00", "18:00"),
  ],
  shifts: [],
  weeks: [],
  timeOff: [],
  vacations: [],
  swaps: [],
  attendance: [],
  notifications: [],
  templates: [],
  pushSubscriptions: [],
  reminded: [],
};

function employee(
  id: string,
  firstName: string,
  lastName: string,
  phone: string,
  email: string,
  departmentId: string,
  positionId: string,
): StoredEmployee {
  return {
    id,
    profile_id: null,
    first_name: firstName,
    last_name: lastName,
    phone,
    email,
    avatar_url: null,
    department_id: departmentId,
    position_id: positionId,
    is_active: true,
    notes: null,
  };
}

function window(
  employeeId: string,
  day: number,
  unavailable: boolean,
  start: string | null,
  end: string | null,
): AvailabilityRow {
  return {
    id: randomUUID(),
    employee_id: employeeId,
    day_of_week: day,
    is_unavailable: unavailable,
    start_time: start,
    end_time: end,
  };
}

function filePath() {
  return path.join(process.cwd(), ".data", "demo-store.json");
}

function readStore(): DemoStore {
  const base = structuredClone(initialStore);
  try {
    const parsed = JSON.parse(readFileSync(filePath(), "utf8")) as Partial<DemoStore>;
    const store: DemoStore = {
      ...base,
      ...parsed,
      departments: parsed.departments ?? base.departments,
      positions: parsed.positions ?? base.positions,
      employees: parsed.employees ?? base.employees,
      availability: parsed.availability ?? base.availability,
      shifts: parsed.shifts ?? seedShifts(),
      weeks: parsed.weeks ?? seedWeeks(),
      timeOff: parsed.timeOff ?? seedTimeOff(),
      vacations: parsed.vacations ?? seedVacations(),
      swaps: parsed.swaps ?? seedSwaps(),
      attendance: parsed.attendance ?? [],
      notifications: parsed.notifications ?? seedNotifications(),
      templates: parsed.templates ?? [],
      pushSubscriptions: parsed.pushSubscriptions ?? [],
      reminded: parsed.reminded ?? [],
    };
    if (!parsed.shifts) {
      writeStore(store);
    }
    return store;
  } catch {
    const store = structuredClone(base);
    store.shifts = seedShifts();
    store.weeks = seedWeeks();
    store.timeOff = seedTimeOff();
    store.vacations = seedVacations();
    store.swaps = seedSwaps();
    store.notifications = seedNotifications();
    return store;
  }
}

function writeStore(store: DemoStore) {
  const target = filePath();
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify(store, null, 2), "utf8");
}

function hydrate(store: DemoStore, person: StoredEmployee): Employee {
  return {
    ...person,
    department: store.departments.find((department) => department.id === person.department_id) ?? null,
    position: store.positions.find((position) => position.id === person.position_id) ?? null,
  };
}

export function demoRestaurantName() {
  return readStore().restaurantName;
}

export function demoListDepartments() {
  return { departments: readStore().departments, error: null };
}

export function demoListPositions() {
  return { positions: readStore().positions, error: null };
}

export function demoListEmployees(filters: {
  q?: string;
  departmentId?: string;
  positionId?: string;
  status?: string;
}) {
  const store = readStore();
  const term = (filters.q ?? "").trim().toLowerCase();
  const employees = store.employees
    .filter((person) => {
      if (filters.departmentId && person.department_id !== filters.departmentId) return false;
      if (filters.positionId && person.position_id !== filters.positionId) return false;
      if (filters.status === "active" && !person.is_active) return false;
      if (filters.status === "inactive" && person.is_active) return false;
      if (!term) return true;
      return [person.first_name, person.last_name, person.phone, person.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    })
    .map((person) => hydrate(store, person))
    .sort((left, right) => left.first_name.localeCompare(right.first_name, "ka"));

  return { employees, error: null };
}

export function demoGetEmployee(id: string) {
  const store = readStore();
  const person = store.employees.find((item) => item.id === id);
  return { employee: person ? hydrate(store, person) : null, error: null };
}

export function demoSaveEmployee(input: {
  id?: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  departmentId: string;
  positionId: string;
  isActive: boolean;
  notes: string | null;
}) {
  const store = readStore();
  const position = store.positions.find((item) => item.id === input.positionId);
  if (!position || position.department_id !== input.departmentId) {
    return { error: "პოზიცია არჩეულ განყოფილებას არ ეკუთვნის." };
  }
  if (input.email && store.employees.some((item) => item.email === input.email && item.id !== input.id)) {
    return { error: "ეს ჩანაწერი უკვე არსებობს." };
  }

  if (input.id) {
    const index = store.employees.findIndex((item) => item.id === input.id);
    if (index === -1) {
      return { error: "თანამშრომელი ვერ მოიძებნა." };
    }
    store.employees[index] = {
      ...store.employees[index],
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone,
      email: input.email,
      avatar_url: input.avatarUrl,
      department_id: input.departmentId,
      position_id: input.positionId,
      is_active: input.isActive,
      notes: input.notes,
    };
  } else {
    store.employees.push({
      id: randomUUID(),
      profile_id: null,
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone,
      email: input.email,
      avatar_url: input.avatarUrl,
      department_id: input.departmentId,
      position_id: input.positionId,
      is_active: input.isActive,
      notes: input.notes,
    });
  }

  writeStore(store);
  return { success: input.id ? "თანამშრომელი განახლდა." : "თანამშრომელი დაემატა." };
}

export function demoSetEmployeeActive(id: string, isActive: boolean) {
  const store = readStore();
  const person = store.employees.find((item) => item.id === id);
  if (!person) {
    return { error: "თანამშრომელი ვერ მოიძებნა." };
  }
  person.is_active = isActive;
  writeStore(store);
  return { success: isActive ? "თანამშრომელი გააქტიურდა." : "თანამშრომელი გაითიშა." };
}

export function demoSaveDepartment(input: { id?: string; name: string }) {
  const store = readStore();
  if (store.departments.some((item) => item.name === input.name && item.id !== input.id)) {
    return { error: "ეს ჩანაწერი უკვე არსებობს." };
  }
  if (input.id) {
    const department = store.departments.find((item) => item.id === input.id);
    if (!department) {
      return { error: "განყოფილება ვერ მოიძებნა." };
    }
    department.name = input.name;
  } else {
    const tokens = ["kitchen", "hall", "bar", "office", "neutral"];
    store.departments.push({
      id: randomUUID(),
      name: input.name,
      color_token: tokens[store.departments.length % tokens.length],
      sort_order: store.departments.length + 1,
    });
  }
  writeStore(store);
  return { success: input.id ? "განყოფილება განახლდა." : "განყოფილება დაემატა." };
}

export function demoDeleteDepartment(id: string) {
  const store = readStore();
  if (store.positions.some((item) => item.department_id === id) || store.employees.some((item) => item.department_id === id)) {
    return { error: "ჩანაწერი სხვა მონაცემებს უკავშირდება და წაშლა ვერ მოხერხდა." };
  }
  store.departments = store.departments.filter((item) => item.id !== id);
  writeStore(store);
  return { success: "განყოფილება წაიშალა." };
}

export function demoSavePosition(input: { id?: string; departmentId: string; name: string }) {
  const store = readStore();
  if (!store.departments.some((item) => item.id === input.departmentId)) {
    return { error: "აირჩიეთ განყოფილება." };
  }
  if (store.positions.some((item) => item.department_id === input.departmentId && item.name === input.name && item.id !== input.id)) {
    return { error: "ეს ჩანაწერი უკვე არსებობს." };
  }
  if (input.id) {
    const position = store.positions.find((item) => item.id === input.id);
    if (!position) {
      return { error: "პოზიცია ვერ მოიძებნა." };
    }
    position.name = input.name;
    position.department_id = input.departmentId;
  } else {
    store.positions.push({
      id: randomUUID(),
      department_id: input.departmentId,
      name: input.name,
      sort_order: 0,
    });
  }
  writeStore(store);
  return { success: input.id ? "პოზიცია განახლდა." : "პოზიცია დაემატა." };
}

export function demoDeletePosition(id: string) {
  const store = readStore();
  if (store.employees.some((item) => item.position_id === id)) {
    return { error: "ჩანაწერი სხვა მონაცემებს უკავშირდება და წაშლა ვერ მოხერხდა." };
  }
  store.positions = store.positions.filter((item) => item.id !== id);
  writeStore(store);
  return { success: "პოზიცია წაიშალა." };
}

export function demoSaveRestaurantName(displayName: string): { error?: string; success?: string } {
  const store = readStore();
  store.restaurantName = displayName;
  writeStore(store);
  return { success: "სახელი განახლდა." };
}

export function demoAvailabilityFor(employeeId: string) {
  return readStore().availability.filter((item) => item.employee_id === employeeId);
}

export function demoActiveEmployeeCount() {
  return readStore().employees.filter((item) => item.is_active).length;
}

export function loadDemoStore() {
  return readStore();
}

export function saveDemoStore(store: DemoStore) {
  writeStore(store);
}

function seedShifts(): StoredShift[] {
  const week = weekRange(todayInTimeZone("Asia/Tbilisi"));
  const day = (offset: number) => addDays(week.start, offset);
  const hall = "22222222-2222-4222-8222-222222222202";
  const kitchen = "22222222-2222-4222-8222-222222222201";
  const bar = "22222222-2222-4222-8222-222222222203";
  const waiter = "33333333-3333-4333-8333-333333333312";
  const cook = "33333333-3333-4333-8333-333333333303";
  const bartender = "33333333-3333-4333-8333-333333333321";
  const manager = "33333333-3333-4333-8333-333333333311";
  const row = (
    id: string,
    employeeId: string,
    departmentId: string,
    positionId: string,
    date: string,
    start: string,
    end: string,
  ): StoredShift => ({
    id,
    employee_id: employeeId,
    department_id: departmentId,
    position_id: positionId,
    shift_date: date,
    start_time: start,
    end_time: end,
    break_minutes: 0,
    notes: null,
    status: "published",
  });

  return [
    row("55555555-5555-4555-8555-555555555501", "44444444-4444-4444-8444-444444444401", hall, waiter, day(0), "10:00", "18:00"),
    row("55555555-5555-4555-8555-555555555502", "44444444-4444-4444-8444-444444444401", hall, waiter, day(0), "16:00", "22:00"),
    row("55555555-5555-4555-8555-555555555503", "44444444-4444-4444-8444-444444444401", hall, waiter, day(2), "12:00", "20:00"),
    row("55555555-5555-4555-8555-555555555504", "44444444-4444-4444-8444-444444444402", kitchen, cook, day(1), "10:00", "18:00"),
    row("55555555-5555-4555-8555-555555555505", "44444444-4444-4444-8444-444444444403", bar, bartender, day(4), "18:00", "00:00"),
    row("55555555-5555-4555-8555-555555555506", "44444444-4444-4444-8444-444444444404", hall, manager, day(6), "12:00", "20:00"),
  ];
}

function seedWeeks(): StoredWeek[] {
  return [{ week_start: weekRange(todayInTimeZone("Asia/Tbilisi")).start, status: "published" }];
}

function seedTimeOff(): StoredTimeOff[] {
  const week = weekRange(todayInTimeZone("Asia/Tbilisi"));
  return [
    {
      id: "66666666-6666-4666-8666-666666666601",
      employee_id: "44444444-4444-4444-8444-444444444401",
      request_date: addDays(week.start, 10),
      reason: "პირადი საქმე",
      status: "pending",
      created_at: new Date().toISOString(),
    },
  ];
}

function seedVacations(): StoredVacation[] {
  const week = weekRange(todayInTimeZone("Asia/Tbilisi"));
  return [
    {
      id: "77777777-7777-4777-8777-777777777701",
      employee_id: "44444444-4444-4444-8444-444444444402",
      start_date: addDays(week.start, 14),
      end_date: addDays(week.start, 18),
      note: "ოჯახური მოგზაურობა",
      status: "pending",
      created_at: new Date().toISOString(),
    },
  ];
}

function seedSwaps(): StoredSwap[] {
  return [
    {
      id: "88888888-8888-4888-8888-888888888801",
      shift_id: "55555555-5555-4555-8555-555555555506",
      requester_employee_id: "44444444-4444-4444-8444-444444444404",
      target_employee_id: "44444444-4444-4444-8444-444444444401",
      status: "pending_manager",
      created_at: new Date().toISOString(),
    },
  ];
}

function seedNotifications(): StoredNotification[] {
  return [
    {
      id: "99999999-9999-4999-8999-999999999901",
      title: "გრაფიკი გამოქვეყნდა",
      body: "ამ კვირის გრაფიკი მზადაა. გადაამოწმეთ ცვლები და გაფრთხილებები.",
      is_read: false,
      created_at: new Date().toISOString(),
    },
  ];
}
