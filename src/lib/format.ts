export function fullName(person: { first_name: string; last_name: string }) {
  return `${person.first_name} ${person.last_name}`.trim();
}

export function formatClock(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  return value.slice(0, 5);
}

export function formatShiftHours(start: string, end: string) {
  return `${formatClock(start)}–${formatClock(end)}`;
}

export function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export const departmentColorClass: Record<string, string> = {
  kitchen: "bg-[#9a3412]",
  hall: "bg-[#3f6212]",
  bar: "bg-[#1e3a5f]",
  office: "bg-[#57534e]",
  neutral: "bg-[#78716c]",
};

export function departmentSwatch(token: string | null | undefined) {
  return departmentColorClass[token ?? "neutral"] ?? departmentColorClass.neutral;
}
