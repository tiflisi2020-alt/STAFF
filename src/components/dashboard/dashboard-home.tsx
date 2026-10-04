import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { formatGeorgianDate } from "@/lib/dates";
import { formatClock } from "@/lib/format";
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
  const cards =
    role === "admin"
      ? [
          { label: "თანამშრომლები", value: data.employeeCount },
          { label: "დღეს მუშაობს", value: data.workingToday },
          { label: "დღეს დასვენებაზეა", value: data.offToday },
          { label: "მოთხოვნები", value: data.requestCount },
        ]
      : [
          { label: "დღევანდელი ცვლები", value: data.shifts.length },
          { label: "მოთხოვნები", value: data.requestCount },
        ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">დღეს — {todayLabel}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">გამარჯობა, {name}</h1>
        </div>
        {role === "admin" ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/employees"
              className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              თანამშრომლები
            </Link>
            <Link
              href="/schedule"
              className="inline-flex h-10 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium"
            >
              გრაფიკი
            </Link>
          </div>
        ) : null}
      </div>

      {data.error ? (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm leading-6 text-destructive">
          {data.error}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-2xl bg-card px-5 py-4 shadow-sm ring-1 ring-foreground/10">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{card.value}</p>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">დღევანდელი ცვლები</h2>
        {data.shifts.length === 0 ? (
          <EmptyState title="დღეს ცვლები არ არის" description="გამოქვეყნებული ან დაგეგმილი ცვლა ამ დღისთვის ვერ მოიძებნა." />
        ) : (
          <div className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-foreground/10">
            <div className="hidden grid-cols-[1.4fr_1fr_1fr_0.7fr_0.7fr_0.8fr] gap-3 border-b px-4 py-3 text-xs text-muted-foreground md:grid">
              <span>თანამშრომელი</span>
              <span>პოზიცია</span>
              <span>განყოფილება</span>
              <span>დაწყება</span>
              <span>დასრულება</span>
              <span>სტატუსი</span>
            </div>
            <div className="divide-y">
              {data.shifts.map((shift) => (
                <div key={shift.id} className="grid gap-2 px-4 py-3 md:grid-cols-[1.4fr_1fr_1fr_0.7fr_0.7fr_0.8fr] md:items-center">
                  <p className="font-medium">
                    {shift.employee ? `${shift.employee.first_name} ${shift.employee.last_name}` : "თანამშრომელი"}
                  </p>
                  <p className="text-sm text-muted-foreground md:text-foreground">{shift.position?.name ?? "—"}</p>
                  <p className="text-sm text-muted-foreground md:text-foreground">{shift.department?.name ?? "—"}</p>
                  <p className="text-sm">{formatClock(shift.start_time)}</p>
                  <p className="text-sm">{formatClock(shift.end_time)}</p>
                  <StatusBadge status={shift.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">გრაფიკის გაფრთხილებები</h2>
        {data.warnings.length === 0 ? (
          <EmptyState title="გაფრთხილებები არ არის" description="დღევანდელ ცვლებში კონფლიქტი ვერ მოიძებნა." />
        ) : (
          <ul className="space-y-2">
            {data.warnings.map((warning) => (
              <li key={warning.id} className="flex gap-3 rounded-2xl bg-card px-4 py-3 text-sm leading-6 shadow-sm ring-1 ring-foreground/10">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                <span>{warning.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">ბოლო მოთხოვნები</h2>
        {data.requests.length === 0 ? (
          <EmptyState title="მოთხოვნები არ არის" />
        ) : (
          <ul className="space-y-2">
            {data.requests.map((request) => (
              <li key={`${request.kind}-${request.id}`} className="flex flex-col gap-2 rounded-2xl bg-card px-4 py-3 shadow-sm ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{request.label}</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {request.person}
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
