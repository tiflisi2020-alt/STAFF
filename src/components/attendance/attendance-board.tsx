"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveAttendance } from "@/lib/actions/modules";
import { formatGeorgianFullDate, monthRange, todayInTimeZone, weekRange } from "@/lib/dates";
import { formatShiftHours, fullName } from "@/lib/format";
import type { AttendanceLine } from "@/lib/demo/operations";
import type { AttendanceStatus } from "@/types/database";
import { cn } from "cn";

const fieldClass = "field";

const statuses: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "დასწრებული" },
  { value: "late", label: "დაგვიანებული" },
  { value: "absent", label: "არ გამოცხადდა" },
  { value: "day_off", label: "დასვენება" },
  { value: "vacation", label: "შვებულება" },
];

export function AttendanceBoard({
  date,
  lines,
  canEdit,
  error,
}: {
  date: string;
  lines: AttendanceLine[];
  canEdit: boolean;
  error: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [departmentId, setDepartmentId] = useState("");
  const [query, setQuery] = useState("");
  const today = todayInTimeZone("Asia/Tbilisi");
  const week = weekRange(today);
  const month = monthRange(today);
  const periods = [
    { label: "დღეს", href: `/attendance?date=${today}`, active: date === today },
    { label: "ამ კვირაში", href: `/attendance?date=${week.start}`, active: date >= week.start && date <= week.end && date !== today },
    { label: "ამ თვეში", href: `/attendance?date=${month.start}`, active: date >= month.start && date <= month.end && (date < week.start || date > week.end) },
  ];

  const departments = useMemo(() => {
    const map = new Map<string, string>();
    for (const line of lines) {
      if (line.employee.department_id && line.employee.department?.name) {
        map.set(line.employee.department_id, line.employee.department.name);
      }
    }
    return [...map.entries()];
  }, [lines]);

  const visible = lines.filter((line) => {
    if (departmentId && line.employee.department_id !== departmentId) {
      return false;
    }
    if (query && !fullName(line.employee).toLocaleLowerCase("ka").includes(query.trim().toLocaleLowerCase("ka"))) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader title={canEdit ? "დასწრება" : "ჩემი დასწრება"} description={formatGeorgianFullDate(date)} />
      {error ? <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}

      <div className="surface flex flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-2">
          {periods.map((period) => (
            <Link
              key={period.label}
              href={period.href}
              className={cn(
                "inline-flex h-9 items-center rounded-xl px-3 text-sm",
                period.active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
              )}
            >
              {period.label}
            </Link>
          ))}
        </div>
        <form action="/attendance" className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
          <label className="space-y-2 text-sm">
            <span className="font-medium">განყოფილება</span>
            <select className={fieldClass} value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
              <option value="">ყველა</option>
              {departments.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">თანამშრომელი</span>
            <Input value={query} placeholder="სახელი" onChange={(event) => setQuery(event.target.value)} />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">თარიღი</span>
            <Input type="date" name="date" defaultValue={date} />
          </label>
          <Button type="submit" variant="secondary">
            ნახვა
          </Button>
        </form>
      </div>

      <div className="surface overflow-hidden">
        <div className="hidden grid-cols-[1.3fr_1fr_0.8fr_0.8fr_1fr_auto] gap-3 bg-muted/50 px-4 py-2.5 text-xs text-muted-foreground lg:grid">
          <span>თანამშრომელი</span>
          <span>სტატუსი</span>
          <span>მოსვლა</span>
          <span>წასვლა</span>
          <span>შენიშვნა</span>
          <span />
        </div>
        <div className="divide-y divide-border/80">
          {visible.map((line) => (
            <AttendanceRow
              key={line.employee.id}
              line={line}
              date={date}
              canEdit={canEdit}
              pending={pending}
              onSave={(input) =>
                startTransition(async () => {
                  const result = await saveAttendance(input);
                  if (result.error) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success(result.success ?? "დასწრება შეინახა.");
                  router.refresh();
                })
              }
            />
          ))}
          {visible.length === 0 ? <p className="px-4 py-8 text-center text-sm text-muted-foreground">ამ ფილტრით ჩანაწერი არ არის.</p> : null}
        </div>
      </div>
    </div>
  );
}

function AttendanceRow({
  line,
  date,
  canEdit,
  pending,
  onSave,
}: {
  line: AttendanceLine;
  date: string;
  canEdit: boolean;
  pending: boolean;
  onSave: (input: {
    employeeId: string;
    date: string;
    actualStart: string;
    actualEnd: string;
    status: AttendanceStatus;
    notes: string;
  }) => void;
}) {
  const [status, setStatus] = useState<AttendanceStatus>(line.record?.status ?? (line.shiftId ? "present" : "day_off"));
  const [actualStart, setActualStart] = useState(line.record?.actual_start?.slice(0, 5) ?? line.scheduledStart ?? "");
  const [actualEnd, setActualEnd] = useState(line.record?.actual_end?.slice(0, 5) ?? line.scheduledEnd ?? "");
  const [notes, setNotes] = useState(line.record?.notes ?? "");

  return (
    <article className="grid gap-3 px-4 py-3 transition-colors hover:bg-muted/30 lg:grid-cols-[1.3fr_1fr_0.8fr_0.8fr_1fr_auto] lg:items-end">
      <div>
        <p className="font-medium">{fullName(line.employee)}</p>
        <p className="text-sm text-muted-foreground">
          {line.employee.department?.name ? `${line.employee.department.name} · ` : ""}
          {line.scheduledStart ? `გრაფიკი ${formatShiftHours(line.scheduledStart, line.scheduledEnd ?? "")}` : "ცვლა არ აქვს"}
        </p>
        {!canEdit ? (
          <div className="mt-2 lg:hidden">
            <StatusBadge status={status} />
          </div>
        ) : null}
      </div>
      <label className="space-y-2 text-sm">
        <span className="font-medium lg:sr-only">სტატუსი</span>
        <select className={fieldClass} value={status} disabled={!canEdit} onChange={(event) => setStatus(event.target.value as AttendanceStatus)}>
          {statuses.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-2 text-sm">
        <span className="font-medium lg:sr-only">მოსვლა</span>
        <Input type="time" value={actualStart} disabled={!canEdit} onChange={(event) => setActualStart(event.target.value)} />
      </label>
      <label className="space-y-2 text-sm">
        <span className="font-medium lg:sr-only">წასვლა</span>
        <Input type="time" value={actualEnd} disabled={!canEdit} onChange={(event) => setActualEnd(event.target.value)} />
      </label>
      <label className="space-y-2 text-sm">
        <span className="font-medium lg:sr-only">შენიშვნა</span>
        <Input value={notes} disabled={!canEdit} onChange={(event) => setNotes(event.target.value)} />
      </label>
      {canEdit ? (
        <Button
          type="button"
          disabled={pending}
          onClick={() => onSave({ employeeId: line.employee.id, date, actualStart, actualEnd, status, notes })}
        >
          შენახვა
        </Button>
      ) : null}
    </article>
  );
}
