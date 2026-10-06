import { ScheduleBoard } from "@/components/schedule/schedule-board";
import { requireSession } from "@/lib/auth/context";
import { todayInTimeZone, weekRange } from "@/lib/dates";
import { getEmployeeByProfile } from "@/lib/data/employees";
import { getScheduleTemplates, getWeekBoard } from "@/lib/data/modules";
import { fullName } from "@/lib/format";

export const metadata = { title: "გრაფიკი" };

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; new?: string }>;
}) {
  const context = await requireSession();
  const params = await searchParams;
  const requested = params.week && /^\d{4}-\d{2}-\d{2}$/.test(params.week) ? params.week : todayInTimeZone(context.timezone);
  const isAdmin = context.profile.role === "admin";
  const board = await getWeekBoard(weekRange(requested).start);
  const templates = isAdmin ? (await getScheduleTemplates()).templates : [];
  const ownId = isAdmin ? null : await getEmployeeByProfile(context.userId);
  const own = ownId ? board.employees.find((employee) => employee.id === ownId) : null;
  const ownName = own ? fullName(own) : "";
  const visible = isAdmin
    ? board
    : {
        ...board,
        employees: own ? [own] : [],
        shifts: board.shifts.filter((shift) => shift.employee_id === ownId),
        warnings: board.warnings.filter((warning) => ownName && warning.message.includes(ownName)),
      };

  return (
    <div className="space-y-4">
      {board.error ? <p className="text-sm text-destructive">{board.error}</p> : null}
      <ScheduleBoard board={visible} isAdmin={isAdmin} templates={templates} initialCreate={params.new === "1"} />
    </div>
  );
}
