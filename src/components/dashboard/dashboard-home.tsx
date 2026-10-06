import Link from "next/link";
import { ArrowRight, CalendarPlus, ClipboardList, Palmtree, Plus, TriangleAlert, UserRound, Users } from "lucide-react";
import { PublishWeekButton } from "@/components/dashboard/publish-week-button";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { formatGeorgianDate } from "@/lib/dates";
import { departmentSwatch, formatClock, formatShiftHours, initials } from "@/lib/format";
import type { WorkStatRow } from "@/lib/scheduling/stats";
import type { DashboardData } from "@/lib/data/dashboard";
import type { AppRole } from "@/types/auth";

export function DashboardHome({
  role,
  name,
  todayLabel,
  data,
}: {
  role: AppRole;
  name: string;
  todayLabel: string;
  data: DashboardData;
}) {
  const firstName = name.split(" ")[0] || name;
  const cards =
    role === "admin"
      ? [
          { label: "თანამშრომლები", value: data.employeeCount, detail: "აქტიური თანამშრომლები", icon: Users },
          { label: "დღეს მუშაობს", value: data.workingToday, detail: "დღევანდელი ცვლები", icon: UserRound },
          { label: "დღეს დასვენება", value: data.offToday, detail: "დასვენებაზე მყოფი თანამშრომლები", icon: Palmtree },
          { label: "მოთხოვნები", value: data.requestCount, detail: "მოლოდინში", icon: ClipboardList },
        ]
      : [
          { label: "დღევანდელი ცვლები", value: data.shifts.length, detail: "თქვენი დღევანდელი გრაფიკი", icon: CalendarPlus },
          { label: "მოთხოვნები", value: data.requestCount, detail: "გაგზავნილი მოთხოვნები", icon: ClipboardList },
        ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">დღეს, {todayLabel}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">გამარჯობა, {firstName}</h1>
        </div>
        {role === "admin" ? (
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/employees?new=1">
              <Plus />
              თანამშრომლის დამატება
            </ButtonLink>
            <ButtonLink href="/schedule?new=1" variant="outline">
              <CalendarPlus />
              ცვლის დამატება
            </ButtonLink>
            <PublishWeekButton weekStart={data.stats.weekStart} />
          </div>
        ) : (
          <ButtonLink href="/schedule" variant="outline">
            ჩემი გრაფიკი
          </ButtonLink>
        )}
      </div>

      {data.error ? (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm leading-6 text-destructive">
          {data.error}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} detail={card.detail} icon={card.icon} />
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">დღევანდელი ცვლები</h2>
          <Link href="/schedule" className="text-sm font-medium text-primary">
            გრაფიკი
          </Link>
        </div>
        {data.shifts.length === 0 ? (
          <EmptyState title="დღეს ცვლები არ არის" description="გამოქვეყნებული ან დაგეგმილი ცვლა ამ დღისთვის ვერ მოიძებნა." />
        ) : (
          <div className="surface overflow-hidden">
            <div className="hidden grid-cols-[1.6fr_1fr_1fr_0.9fr_0.7fr] gap-3 bg-muted/50 px-4 py-2.5 text-xs text-muted-foreground md:grid">
              <span>თანამშრომელი</span>
              <span>პოზიცია</span>
              <span>განყოფილება</span>
              <span>დრო</span>
              <span>სტატუსი</span>
            </div>
            <div className="divide-y divide-border/80">
              {data.shifts.map((shift) => {
                const person = shift.employee;
                return (
                  <div
                    key={shift.id}
                    className="grid gap-2 px-4 py-3 transition-colors hover:bg-muted/40 md:grid-cols-[1.6fr_1fr_1fr_0.9fr_0.7fr] md:items-center"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        {person && "avatar_url" in person && person.avatar_url ? <AvatarImage src={person.avatar_url} alt="" /> : null}
                        <AvatarFallback>{person ? initials(person.first_name, person.last_name) : "თ"}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{person ? `${person.first_name} ${person.last_name}` : "თანამშრომელი"}</p>
                        <p className="truncate text-sm text-muted-foreground md:hidden">{shift.position?.name ?? "—"}</p>
                      </div>
                    </div>
                    <p className="hidden text-sm md:block">{shift.position?.name ?? "—"}</p>
                    <p className="flex items-center gap-2 text-sm">
                      <span className={`size-2 rounded-full ${departmentSwatch(shift.department?.color_token)}`} />
                      {shift.department?.name ?? "—"}
                    </p>
                    <p className="text-sm">{formatShiftHours(shift.start_time, shift.end_time) || `${formatClock(shift.start_time)} – ${formatClock(shift.end_time)}`}</p>
                    <StatusBadge status={shift.status} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">გრაფიკის გაფრთხილებები</h2>
        {data.warnings.length === 0 ? (
          <EmptyState title="გაფრთხილებები არ არის" description="დღევანდელ ცვლებში კონფლიქტი ვერ მოიძებნა." />
        ) : (
          <ul className="surface divide-y divide-border/70 overflow-hidden">
            {data.warnings.map((warning) => (
              <li key={warning.id} className="flex items-center gap-3 bg-warning/70 px-4 py-3 text-sm leading-6">
                <TriangleAlert className="size-4 shrink-0 text-warning-foreground" />
                <span className="min-w-0 flex-1 text-warning-foreground">{warning.message}</span>
                <Link href="/schedule" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-foreground">
                  ნახვა
                  <ArrowRight className="size-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <WorkStatistics data={data} />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">ბოლო მოთხოვნები</h2>
        {data.requests.length === 0 ? (
          <EmptyState title="მოთხოვნები არ არის" description="ახალი მოთხოვნა აქ გამოჩნდება." />
        ) : (
          <ul className="surface divide-y divide-border/80 overflow-hidden">
            {data.requests.map((request) => (
              <li key={`${request.kind}-${request.id}`} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{request.person}</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {request.label}
                    {request.kind === "swap" ? ` → ${request.detail}` : ` · ${formatRequestDetail(request.detail)}`}
                  </p>
                </div>
                <StatusBadge status={request.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatHours(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return `${hours} სთ`;
  }
  return `${hours} სთ ${minutes} წთ`;
}

function WorkStatistics({ data }: { data: DashboardData }) {
  const stats = data.stats;
  const maxMinutes = Math.max(...stats.byEmployee.map((row) => row.minutes), 1);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">ამ კვირის მუშაობა</h2>
        {stats.weekStart ? (
          <p className="text-sm text-muted-foreground">
            {formatGeorgianDate(stats.weekStart)} – {formatGeorgianDate(stats.weekEnd)}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <article className="surface px-5 py-4">
          <p className="text-sm text-muted-foreground">დაგეგმილი საათები</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{formatHours(stats.totalMinutes)}</p>
        </article>
        <article className="surface px-5 py-4">
          <p className="text-sm text-muted-foreground">ცვლები</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{stats.shiftCount}</p>
        </article>
        <article className="surface px-5 py-4">
          <p className="text-sm text-muted-foreground">დასწრება</p>
          {stats.attendanceRecorded ? (
            <p className="mt-2 text-sm leading-6">
              დასწრებული {stats.attendance.present} · დაგვიანებული {stats.attendance.late} · არ გამოცხადდა {stats.attendance.absent}
            </p>
          ) : (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">ამ კვირის დასწრება ჯერ არ არის შევსებული.</p>
          )}
        </article>
      </div>

      {stats.byEmployee.length === 0 ? (
        <EmptyState title="ამ კვირას ცვლები არ არის" description="გრაფიკში ცვლის დამატების შემდეგ საათები აქ გამოჩნდება." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="surface space-y-3 p-4">
            <h3 className="text-sm font-medium">თანამშრომლები</h3>
            <ul className="space-y-3">
              {stats.byEmployee.map((row) => (
                <StatBar key={row.id} row={row} maxMinutes={maxMinutes} />
              ))}
            </ul>
          </div>
          <div className="surface space-y-3 p-4">
            <h3 className="text-sm font-medium">განყოფილებები</h3>
            <ul className="space-y-3">
              {stats.byDepartment.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={`size-2 shrink-0 rounded-full ${departmentSwatch(row.colorToken)}`} />
                    <span className="truncate font-medium">{row.name}</span>
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {formatHours(row.minutes)} · {row.shifts} ცვლა
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

function StatBar({ row, maxMinutes }: { row: WorkStatRow; maxMinutes: number }) {
  const width = Math.max(8, Math.round((row.minutes / maxMinutes) * 100));
  return (
    <li className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <p className="min-w-0 truncate font-medium">
          {row.name}
          {row.detail ? <span className="font-normal text-muted-foreground"> · {row.detail}</span> : null}
        </p>
        <p className="shrink-0 text-muted-foreground">
          {formatHours(row.minutes)} · {row.shifts}
        </p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary/80" style={{ width: `${width}%` }} />
      </div>
    </li>
  );
}

function formatRequestDetail(detail: string) {
  if (detail.includes("–")) {
    const [start, end] = detail.split("–").map((part) => part.trim());
    return `${formatGeorgianDate(start)} – ${formatGeorgianDate(end)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(detail)) {
    return formatGeorgianDate(detail);
  }
  return detail;
}
