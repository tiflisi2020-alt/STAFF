const WEEKDAY_LABELS = [
  "",
  "ორშაბათი",
  "სამშაბათი",
  "ოთხშაბათი",
  "ხუთშაბათი",
  "პარასკევი",
  "შაბათი",
  "კვირა",
];

const MONTH_LABELS = [
  "",
  "იანვარი",
  "თებერვალი",
  "მარტი",
  "აპრილი",
  "მაისი",
  "ივნისი",
  "ივლისი",
  "აგვისტო",
  "სექტემბერი",
  "ოქტომბერი",
  "ნოემბერი",
  "დეკემბერი",
];

export function todayInTimeZone(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDays(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isoWeekday(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

export function weekRange(isoDate: string) {
  const weekday = isoWeekday(isoDate);
  const start = addDays(isoDate, -(weekday - 1));
  return { start, end: addDays(start, 6) };
}

export function monthRange(isoDate: string) {
  const [year, month] = isoDate.split("-").map(Number);
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { start, end };
}

export function weekdayLabel(day: number) {
  return WEEKDAY_LABELS[day] ?? "";
}

export function formatGeorgianDate(isoDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return isoDate;
  }
  const [, month, day] = isoDate.split("-").map(Number);
  return `${day} ${MONTH_LABELS[month] ?? ""}`.trim();
}

export function formatGeorgianFullDate(isoDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return isoDate;
  }
  const [year] = isoDate.split("-");
  return `${weekdayLabel(isoWeekday(isoDate))}, ${formatGeorgianDate(isoDate)}, ${year}`;
}

export function formatTodayLabel(timeZone: string) {
  return formatGeorgianFullDate(todayInTimeZone(timeZone));
}

export function eachDate(start: string, end: string) {
  const dates: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}
