import { ScheduleBoard } from "@/components/schedule/schedule-board";
import { requireSession } from "@/lib/auth/context";
import { todayInTimeZone, weekRange } from "@/lib/dates";
import { getWeekBoard } from "@/lib/data/modules";

export const metadata = { title: "გრაფიკი" };

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const context = await requireSession();
  const params = await searchParams;
  const requested = params.week && /^\d{4}-\d{2}-\d{2}$/.test(params.week) ? params.week : todayInTimeZone(context.timezone);
  const board = await getWeekBoard(weekRange(requested).start);

  return (
    <div className="space-y-4">
      {board.error ? <p className="text-sm text-destructive">{board.error}</p> : null}
      <ScheduleBoard board={board} isAdmin={context.profile.role === "admin"} />
    </div>
  );
}
