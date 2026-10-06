import { formatGeorgianDate } from "@/lib/dates";

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
  kitchen: "bg-[#8d6b45]",
  hall: "bg-[#2f5d45]",
  bar: "bg-[#6d5a45]",
  office: "bg-[#6f6a64]",
  neutral: "bg-[#8a847c]",
};

export function formatRelativeTime(value: string) {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) {
    return "";
  }
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) {
    return "ახლახანს";
  }
  if (minutes < 60) {
    return `${minutes} წუთის წინ`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} საათის წინ`;
  }
  const days = Math.round(hours / 24);
  if (days < 14) {
    return `${days} დღის წინ`;
  }
  return formatGeorgianDate(value.slice(0, 10));
}

export function departmentSwatch(token: string | null | undefined) {
  return departmentColorClass[token ?? "neutral"] ?? departmentColorClass.neutral;
}
