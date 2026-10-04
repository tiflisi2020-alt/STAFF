import { AttendanceBoard } from "@/components/attendance/attendance-board";
import { EmptyState } from "@/components/empty-state";
import { requireSession } from "@/lib/auth/context";
import { todayInTimeZone } from "@/lib/dates";
import { getEmployeeByProfile } from "@/lib/data/employees";
import { getAttendanceDay } from "@/lib/data/modules";

export const metadata = { title: "დასწრება" };

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const context = await requireSession();
  const params = await searchParams;
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayInTimeZone(context.timezone);
  const { lines, error } = await getAttendanceDay(date);
  const isAdmin = context.profile.role === "admin";
  const ownId = isAdmin ? null : await getEmployeeByProfile(context.userId);
  const visible = isAdmin ? lines : lines.filter((line) => line.employee.id === ownId);

  if (!isAdmin && !ownId) {
    return <EmptyState title="თანამშრომლის ბარათი არ არის მიბმული" description="დასწრება გამოჩნდება, როცა ანგარიში თანამშრომელს დაუკავშირდება." />;
  }

  return <AttendanceBoard date={date} lines={visible} canEdit={isAdmin} error={error} />;
}
