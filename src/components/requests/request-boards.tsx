"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createSwap,
  createTimeOff,
  createVacation,
  respondSwap,
  reviewSwap,
  reviewTimeOff,
  reviewVacation,
} from "@/lib/actions/modules";
import { formatGeorgianDate } from "@/lib/dates";
import { formatShiftHours, fullName } from "@/lib/format";
import type { SwapView } from "@/lib/demo/operations";
import type { Employee, ShiftRow, TimeOffRow, VacationRow } from "@/types/database";

const fieldClass = "field";

function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function run(action: Promise<{ error?: string; success?: string }>) {
    startTransition(async () => {
      const result = await action;
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.success) {
        toast.success(result.success);
      }
      router.refresh();
    });
  }
  return { pending, run };
}

export function TimeOffBoard({
  requests,
  employees,
  lockedEmployeeId,
  error,
}: {
  requests: TimeOffRow[];
  employees: Employee[];
  lockedEmployeeId?: string;
  error: string | null;
}) {
  const { pending, run } = useAction();
  const [employeeId, setEmployeeId] = useState(lockedEmployeeId ?? employees[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const isAdmin = !lockedEmployeeId;

  return (
    <div className="space-y-6">
      <PageHeader title={isAdmin ? "დასვენების მოთხოვნები" : "ჩემი მოთხოვნები"} description="ერთი კონკრეტული დღის დასვენება." />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <form
        className="grid gap-3 surface p-4 md:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          run(createTimeOff({ employeeId: lockedEmployeeId ?? employeeId, date, reason }));
        }}
      >
        {isAdmin ? (
          <label className="space-y-2 text-sm">
            <span className="font-medium">თანამშრომელი</span>
            <select className={fieldClass} value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {fullName(employee)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="space-y-2 text-sm">
          <span className="font-medium">თარიღი</span>
          <Input type="date" required value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label className="space-y-2 text-sm md:col-span-2">
          <span className="font-medium">მიზეზი</span>
          <Input value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
        <div className="md:col-span-4">
          <Button type="submit" disabled={pending}>
            მოთხოვნის გაგზავნა
          </Button>
        </div>
      </form>
      {requests.length === 0 ? (
        <EmptyState title="მოთხოვნა არ არის" />
      ) : (
        <div className="space-y-2">
          {requests.map((request) => (
            <article key={request.id} className="surface flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{request.employee ? fullName(request.employee) : "თანამშრომელი"}</p>
                <p className="text-sm text-muted-foreground">
                  {formatGeorgianDate(request.request_date)}
                  {request.reason ? ` · ${request.reason}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={request.status} />
                {isAdmin && request.status === "pending" ? (
                  <>
                    <Button type="button" size="sm" disabled={pending} onClick={() => run(reviewTimeOff(request.id, "approved"))}>
                      დამტკიცება
                    </Button>
                    <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(reviewTimeOff(request.id, "rejected"))}>
                      უარყოფა
                    </Button>
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function VacationBoard({
  requests,
  employees,
  lockedEmployeeId,
  error,
}: {
  requests: VacationRow[];
  employees: Employee[];
  lockedEmployeeId?: string;
  error: string | null;
}) {
  const { pending, run } = useAction();
  const [employeeId, setEmployeeId] = useState(lockedEmployeeId ?? employees[0]?.id ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const isAdmin = !lockedEmployeeId;

  return (
    <div className="space-y-6">
      <PageHeader title="შვებულებები" description="რამდენიმე დღის შვებულების მოთხოვნა." />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <form
        className="grid gap-3 surface p-4 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          run(createVacation({ employeeId: lockedEmployeeId ?? employeeId, startDate, endDate, note }));
        }}
      >
        {isAdmin ? (
          <label className="space-y-2 text-sm md:col-span-2">
            <span className="font-medium">თანამშრომელი</span>
            <select className={fieldClass} value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {fullName(employee)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="space-y-2 text-sm">
          <span className="font-medium">დაწყება</span>
          <Input type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">დასრულება</span>
          <Input type="date" required value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </label>
        <label className="space-y-2 text-sm md:col-span-2">
          <span className="font-medium">შენიშვნა</span>
          <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <Button type="submit" disabled={pending}>
          მოთხოვნის გაგზავნა
        </Button>
      </form>
      {requests.length === 0 ? (
        <EmptyState title="შვებულების მოთხოვნა არ არის" />
      ) : (
        <div className="space-y-2">
          {requests.map((request) => (
            <article key={request.id} className="surface flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{request.employee ? fullName(request.employee) : "თანამშრომელი"}</p>
                <p className="text-sm text-muted-foreground">
                  {formatGeorgianDate(request.start_date)} – {formatGeorgianDate(request.end_date)}
                  {request.note ? ` · ${request.note}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={request.status} />
                {isAdmin && request.status === "pending" ? (
                  <>
                    <Button type="button" size="sm" disabled={pending} onClick={() => run(reviewVacation(request.id, "approved"))}>
                      დამტკიცება
                    </Button>
                    <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(reviewVacation(request.id, "rejected"))}>
                      უარყოფა
                    </Button>
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function SwapBoard({
  requests,
  shifts,
  employees,
  isAdmin,
  error,
}: {
  requests: SwapView[];
  shifts: ShiftRow[];
  employees: Employee[];
  isAdmin: boolean;
  error: string | null;
}) {
  const { pending, run } = useAction();
  const [shiftId, setShiftId] = useState(shifts[0]?.id ?? "");
  const [targetEmployeeId, setTargetEmployeeId] = useState(employees[0]?.id ?? "");

  return (
    <div className="space-y-6">
      <PageHeader title="ცვლის გაცვლა" description="ჯერ მიმღები ადასტურებს, შემდეგ მენეჯერი." />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <form
        className="grid gap-3 surface p-4 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          run(createSwap({ shiftId, targetEmployeeId }));
        }}
      >
        <label className="space-y-2 text-sm">
          <span className="font-medium">ცვლა</span>
          <select className={fieldClass} value={shiftId} onChange={(event) => setShiftId(event.target.value)}>
            {shifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.employee ? fullName(shift.employee) : "თანამშრომელი"} · {formatGeorgianDate(shift.shift_date)} ·{" "}
                {formatShiftHours(shift.start_time, shift.end_time)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">მიმღები</span>
          <select className={fieldClass} value={targetEmployeeId} onChange={(event) => setTargetEmployeeId(event.target.value)}>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {fullName(employee)}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" disabled={pending || shifts.length === 0}>
          გაცვლის მოთხოვნა
        </Button>
      </form>
      {requests.length === 0 ? (
        <EmptyState title="გაცვლის მოთხოვნა არ არის" />
      ) : (
        <div className="space-y-2">
          {requests.map((request) => (
            <article key={request.id} className="surface flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">
                  {request.requester_name} → {request.target_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {request.shift_date ? formatGeorgianDate(request.shift_date) : "ცვლა წაშლილია"}
                  {request.start_time ? ` · ${formatShiftHours(request.start_time, request.end_time)}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={request.status} />
                {request.status === "pending_peer" ? (
                  <>
                    <Button type="button" size="sm" disabled={pending} onClick={() => run(respondSwap(request.id, true))}>
                      მიმღების დადასტურება
                    </Button>
                    <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(respondSwap(request.id, false))}>
                      მიმღების უარი
                    </Button>
                  </>
                ) : null}
                {isAdmin && request.status === "pending_manager" ? (
                  <>
                    <Button type="button" size="sm" disabled={pending} onClick={() => run(reviewSwap(request.id, true))}>
                      დამტკიცება
                    </Button>
                    <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(reviewSwap(request.id, false))}>
                      უარყოფა
                    </Button>
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
