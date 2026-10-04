"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveAttendance } from "@/lib/actions/modules";
import { formatGeorgianFullDate } from "@/lib/dates";
import { formatShiftHours, fullName } from "@/lib/format";
import type { AttendanceLine } from "@/lib/demo/operations";
import type { AttendanceStatus } from "@/types/database";

const fieldClass =
  "h-11 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

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

  return (
    <div className="space-y-6">
      <PageHeader title={canEdit ? "დასწრება" : "ჩემი დასწრება"} description={formatGeorgianFullDate(date)} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <form action="/attendance" className="flex flex-wrap items-end gap-3">
        <label className="space-y-2 text-sm">
          <span className="font-medium">თარიღი</span>
          <Input type="date" name="date" defaultValue={date} />
        </label>
        <Button type="submit" variant="secondary">
          ნახვა
        </Button>
      </form>
      <div className="space-y-3">
        {lines.map((line) => (
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
    <article className="grid gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-foreground/10 lg:grid-cols-[1.3fr_1fr_0.8fr_0.8fr_1fr_auto] lg:items-end">
      <div>
        <p className="font-medium">{fullName(line.employee)}</p>
        <p className="text-sm text-muted-foreground">
          {line.scheduledStart ? `გრაფიკი ${formatShiftHours(line.scheduledStart, line.scheduledEnd ?? "")}` : "ცვლა არ აქვს"}
        </p>
      </div>
      <label className="space-y-2 text-sm">
        <span className="font-medium">სტატუსი</span>
        <select className={fieldClass} value={status} disabled={!canEdit} onChange={(event) => setStatus(event.target.value as AttendanceStatus)}>
          {statuses.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-2 text-sm">
        <span className="font-medium">მოსვლა</span>
        <Input type="time" value={actualStart} disabled={!canEdit} onChange={(event) => setActualStart(event.target.value)} />
      </label>
      <label className="space-y-2 text-sm">
        <span className="font-medium">წასვლა</span>
        <Input type="time" value={actualEnd} disabled={!canEdit} onChange={(event) => setActualEnd(event.target.value)} />
      </label>
      <label className="space-y-2 text-sm">
        <span className="font-medium">შენიშვნა</span>
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
