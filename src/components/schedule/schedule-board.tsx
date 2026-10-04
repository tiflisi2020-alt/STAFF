"use client";

import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { copyPreviousWeek, deleteShift, moveShift, publishWeek, saveShift } from "@/lib/actions/modules";
import { eachDate, formatGeorgianDate, isoWeekday, todayInTimeZone, weekdayLabel } from "@/lib/dates";
import { departmentSwatch, formatShiftHours, fullName, initials } from "@/lib/format";
import type { WeekBoard } from "@/lib/demo/operations";
import type { ShiftRow } from "@/types/database";
import { cn } from "cn";

const fieldClass =
  "h-11 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const shortDays = ["", "ორშაბათი", "სამშაბათი", "ოთხშაბათი", "ხუთშაბათი", "პარასკევი", "შაბათი", "კვირა"];

const shiftTone: Record<string, string> = {
  kitchen: "border-l-[#c2410c] bg-[#fff7ed] text-[#7c2d12]",
  hall: "border-l-[#4d7c0f] bg-[#f7fee7] text-[#365314]",
  bar: "border-l-[#1d4ed8] bg-[#eff6ff] text-[#1e3a8a]",
  office: "border-l-[#78716c] bg-[#fafaf9] text-[#44403c]",
  neutral: "border-l-primary bg-primary/5 text-foreground",
};

function toneFor(token: string | null | undefined) {
  return shiftTone[token ?? "neutral"] ?? shiftTone.neutral;
}

type Draft = {
  id?: string;
  employeeId: string;
  departmentId: string;
  positionId: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  notes: string;
};

export function ScheduleBoard({ board, isAdmin }: { board: WeekBoard; isAdmin: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [mobileDay, setMobileDay] = useState(board.weekStart);
  const days = eachDate(board.weekStart, board.weekEnd);
  const today = todayInTimeZone("Asia/Tbilisi");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const positionsFor = useMemo(
    () => board.positions.filter((position) => position.department_id === draft?.departmentId),
    [board.positions, draft?.departmentId],
  );

  function run(action: Promise<{ error?: string; success?: string; warnings?: string[] }>, close = true) {
    startTransition(async () => {
      const result = await action;
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.success) {
        toast.success(result.success);
      }
      result.warnings?.forEach((warning) => toast.warning(warning));
      if (close) {
        setDraft(null);
        setCopyOpen(false);
      }
      router.refresh();
    });
  }

  function openCreate(employeeId = "", shiftDate = board.weekStart) {
    const person = board.employees.find((item) => item.id === employeeId);
    setDraft({
      employeeId,
      departmentId: person?.department_id ?? board.departments[0]?.id ?? "",
      positionId: person?.position_id ?? "",
      shiftDate,
      startTime: "10:00",
      endTime: "18:00",
      breakMinutes: 0,
      notes: "",
    });
  }

  function openEdit(shift: ShiftRow) {
    const stored = board.shifts.find((item) => item.id === shift.id);
    const person = board.employees.find((item) => item.id === shift.employee_id);
    setDraft({
      id: shift.id,
      employeeId: shift.employee_id,
      departmentId: person?.department_id ?? board.departments[0]?.id ?? "",
      positionId: person?.position_id ?? "",
      shiftDate: shift.shift_date,
      startTime: shift.start_time,
      endTime: shift.end_time,
      breakMinutes: 0,
      notes: "",
    });
    void stored;
  }

  function onDragEnd(event: DragEndEvent) {
    const over = event.over?.id ? String(event.over.id) : "";
    const [employeeId, shiftDate] = over.split("|");
    if (!employeeId || !shiftDate || !isAdmin) {
      return;
    }
    run(moveShift(String(event.active.id), employeeId, shiftDate), false);
  }

  const previous = `/schedule?week=${days.length ? shiftWeek(board.weekStart, -7) : board.weekStart}`;
  const next = `/schedule?week=${shiftWeek(board.weekStart, 7)}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdmin ? "გრაფიკი" : "ჩემი გრაფიკი"}
        description={`${formatGeorgianDate(board.weekStart)} – ${formatGeorgianDate(board.weekEnd)}`}
        action={
          isAdmin ? (
            <Button type="button" className="h-11" onClick={() => openCreate()}>
              ცვლის დამატება
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" render={<Link href={previous} />}>
          წინა კვირა
        </Button>
        <Button variant="outline" render={<Link href="/schedule" />}>
          ეს კვირა
        </Button>
        <Button variant="outline" render={<Link href={next} />}>
          შემდეგი კვირა
        </Button>
        <StatusBadge status={board.status} />
        {isAdmin ? (
          <>
            <Button type="button" variant="secondary" disabled={pending} onClick={() => run(publishWeek(board.weekStart), false)}>
              გამოქვეყნება
            </Button>
            <Button type="button" variant="outline" onClick={() => setCopyOpen(true)}>
              წინა კვირის კოპირება
            </Button>
          </>
        ) : null}
      </div>

      {board.warnings.length > 0 ? (
        <div className="space-y-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950 ring-1 ring-amber-200">
          {board.warnings.map((warning) => (
            <p key={warning.id}>{warning.message}</p>
          ))}
        </div>
      ) : null}

      {board.employees.length === 0 ? (
        <EmptyState title="აქტიური თანამშრომელი არ არის" description="ჯერ დაამატეთ თანამშრომელი, შემდეგ დაგეგმეთ ცვლები." />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            <label className="block space-y-2">
              <span className="text-sm font-medium">დღე</span>
              <select className={fieldClass} value={mobileDay} onChange={(event) => setMobileDay(event.target.value)}>
                {days.map((date) => (
                  <option key={date} value={date}>
                    {weekdayLabel(isoWeekday(date))} · {formatGeorgianDate(date)}
                  </option>
                ))}
              </select>
            </label>
            {board.employees.map((employee) => {
              const shifts = board.shifts.filter((shift) => shift.employee_id === employee.id && shift.shift_date === mobileDay);
              return (
                <article key={employee.id} className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-foreground/10">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{fullName(employee)}</p>
                      <p className="text-sm text-muted-foreground">{employee.position?.name}</p>
                    </div>
                    {isAdmin ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => openCreate(employee.id, mobileDay)}>
                        ცვლა
                      </Button>
                    ) : null}
                  </div>
                  <div className="mt-3 space-y-2">
                    {shifts.length === 0 ? <p className="text-sm text-muted-foreground">ცვლა არ არის</p> : null}
                    {shifts.map((shift) => (
                      <button
                        key={shift.id}
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-xl border border-transparent border-l-4 px-3 py-2 text-left text-sm shadow-sm",
                          toneFor(shift.department?.color_token),
                        )}
                        onClick={() => isAdmin && openEdit(shift)}
                      >
                        <span className="font-semibold">{formatShiftHours(shift.start_time, shift.end_time)}</span>
                        <span className="truncate text-xs opacity-80">{shift.department?.name}</span>
                      </button>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden flex-wrap gap-3 md:flex">
            {board.departments.map((department) => (
              <span key={department.id} className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <span className={cn("size-2.5 rounded-full", departmentSwatch(department.color_token))} />
                {department.name}
              </span>
            ))}
          </div>

          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <div className="hidden overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-foreground/10 md:block">
              <div className="overflow-x-auto">
                <div className="grid min-w-[1040px] grid-cols-[220px_repeat(7,minmax(7.5rem,1fr))]">
                  <div className="sticky left-0 z-20 border-b border-r bg-muted/40 px-4 py-3 text-xs font-medium tracking-wide text-muted-foreground">
                    თანამშრომელი
                  </div>
                  {days.map((date) => {
                    const weekday = isoWeekday(date);
                    const isToday = date === today;
                    return (
                      <div
                        key={date}
                        className={cn(
                          "border-b px-2 py-3 text-center",
                          isToday && "bg-primary text-primary-foreground",
                          !isToday && weekday >= 6 && "bg-muted/70",
                          !isToday && weekday < 6 && "bg-muted/30",
                        )}
                      >
                        <p className={cn("text-[11px]", isToday ? "text-primary-foreground/80" : "text-muted-foreground")}>
                          {shortDays[weekday]}
                        </p>
                        <p className="text-lg font-semibold leading-tight">{date.slice(8)}</p>
                        {isToday ? <p className="text-[11px] font-medium">დღეს</p> : null}
                      </div>
                    );
                  })}
                  {board.employees.map((employee, index) => (
                    <EmployeeRow
                      key={employee.id}
                      employeeName={fullName(employee)}
                      initialsText={initials(employee.first_name, employee.last_name)}
                      position={employee.position?.name ?? ""}
                      departmentToken={employee.department?.color_token}
                      days={days}
                      today={today}
                      striped={index % 2 === 1}
                      shifts={board.shifts.filter((shift) => shift.employee_id === employee.id)}
                      employeeId={employee.id}
                      canEdit={isAdmin}
                      onEdit={openEdit}
                      onCreate={(date) => openCreate(employee.id, date)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </DndContext>
        </>
      )}

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft?.id ? "ცვლის რედაქტირება" : "ახალი ცვლა"}</DialogTitle>
            <DialogDescription>ღამის ცვლა დასაშვებია, თუ დასრულება დაწყებაზე ნაკლებია.</DialogDescription>
          </DialogHeader>
          {draft ? (
            <div className="grid gap-3">
              <label className="space-y-2 text-sm">
                <span className="font-medium">თანამშრომელი</span>
                <select
                  className={fieldClass}
                  value={draft.employeeId}
                  onChange={(event) => {
                    const person = board.employees.find((item) => item.id === event.target.value);
                    setDraft({
                      ...draft,
                      employeeId: event.target.value,
                      departmentId: person?.department_id ?? draft.departmentId,
                      positionId: person?.position_id ?? "",
                    });
                  }}
                >
                  <option value="">აირჩიეთ</option>
                  {board.employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {fullName(employee)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">განყოფილება</span>
                <select
                  className={fieldClass}
                  value={draft.departmentId}
                  onChange={(event) => setDraft({ ...draft, departmentId: event.target.value, positionId: "" })}
                >
                  {board.departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">პოზიცია</span>
                <select className={fieldClass} value={draft.positionId} onChange={(event) => setDraft({ ...draft, positionId: event.target.value })}>
                  <option value="">აირჩიეთ</option>
                  {positionsFor.map((position) => (
                    <option key={position.id} value={position.id}>
                      {position.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">თარიღი</span>
                <Input type="date" value={draft.shiftDate} onChange={(event) => setDraft({ ...draft, shiftDate: event.target.value })} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-2 text-sm">
                  <span className="font-medium">დაწყება</span>
                  <Input type="time" value={draft.startTime} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium">დასრულება</span>
                  <Input type="time" value={draft.endTime} onChange={(event) => setDraft({ ...draft, endTime: event.target.value })} />
                </label>
              </div>
              <label className="space-y-2 text-sm">
                <span className="font-medium">შესვენება, წუთი</span>
                <Input
                  type="number"
                  min={0}
                  max={720}
                  value={draft.breakMinutes}
                  onChange={(event) => setDraft({ ...draft, breakMinutes: Number(event.target.value) || 0 })}
                />
              </label>
            </div>
          ) : null}
          <DialogFooter>
            {draft?.id ? (
              <Button type="button" variant="destructive" disabled={pending} onClick={() => run(deleteShift(draft.id!))}>
                წაშლა
              </Button>
            ) : null}
            <Button
              type="button"
              disabled={pending || !draft}
              onClick={() =>
                draft &&
                run(
                  saveShift({
                    id: draft.id,
                    employeeId: draft.employeeId,
                    departmentId: draft.departmentId,
                    positionId: draft.positionId,
                    shiftDate: draft.shiftDate,
                    startTime: draft.startTime,
                    endTime: draft.endTime,
                    breakMinutes: draft.breakMinutes,
                    notes: draft.notes,
                  }),
                )
              }
            >
              შენახვა
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>წინა კვირის კოპირება</DialogTitle>
            <DialogDescription>არსებული ცვლები შეგიძლიათ შეინარჩუნოთ ან ჩაანაცვლოთ.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => run(copyPreviousWeek(board.weekStart, "merge"))}>
              დამატება
            </Button>
            <Button type="button" disabled={pending} onClick={() => run(copyPreviousWeek(board.weekStart, "replace"))}>
              ჩანაცვლება
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function shiftWeek(weekStart: string, days: number) {
  const [year, month, day] = weekStart.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function EmployeeRow({
  employeeName,
  initialsText,
  position,
  departmentToken,
  days,
  today,
  striped,
  shifts,
  employeeId,
  canEdit,
  onEdit,
  onCreate,
}: {
  employeeName: string;
  initialsText: string;
  position: string;
  departmentToken?: string;
  days: string[];
  today: string;
  striped: boolean;
  shifts: ShiftRow[];
  employeeId: string;
  canEdit: boolean;
  onEdit: (shift: ShiftRow) => void;
  onCreate: (date: string) => void;
}) {
  return (
    <>
      <div className={cn("sticky left-0 z-10 border-r border-t px-3 py-3", striped ? "bg-muted/40" : "bg-card")}>
        <div className="flex items-center gap-2.5">
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white", departmentSwatch(departmentToken))}>
            {initialsText}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{employeeName}</p>
            <p className="truncate text-xs text-muted-foreground">{position}</p>
          </div>
        </div>
      </div>
      {days.map((date) => (
        <DayCell
          key={`${employeeId}-${date}`}
          id={`${employeeId}|${date}`}
          date={date}
          isToday={date === today}
          striped={striped}
          shifts={shifts.filter((shift) => shift.shift_date === date)}
          canEdit={canEdit}
          onEdit={onEdit}
          onCreate={() => onCreate(date)}
        />
      ))}
    </>
  );
}

function DayCell({
  id,
  date,
  isToday,
  striped,
  shifts,
  canEdit,
  onEdit,
  onCreate,
}: {
  id: string;
  date: string;
  isToday: boolean;
  striped: boolean;
  shifts: ShiftRow[];
  canEdit: boolean;
  onEdit: (shift: ShiftRow) => void;
  onCreate: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !canEdit });
  const weekend = isoWeekday(date) >= 6;
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group min-h-28 space-y-1.5 border-t border-l border-foreground/10 p-1.5",
        isToday && "bg-primary/10",
        !isToday && weekend && "bg-muted/50",
        !isToday && !weekend && striped && "bg-muted/20",
        isOver && "bg-primary/15 ring-2 ring-inset ring-primary",
      )}
    >
      {shifts.map((shift) => (
        <ShiftChip key={shift.id} shift={shift} canEdit={canEdit} onEdit={() => onEdit(shift)} />
      ))}
      {canEdit ? (
        <button
          type="button"
          className="flex h-7 w-full items-center justify-center rounded-lg text-xs text-muted-foreground opacity-0 transition hover:bg-background group-hover:opacity-100"
          onClick={onCreate}
        >
          + ცვლა
        </button>
      ) : null}
    </div>
  );
}

function ShiftChip({ shift, canEdit, onEdit }: { shift: ShiftRow; canEdit: boolean; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: shift.id, disabled: !canEdit });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "flex items-stretch overflow-hidden rounded-lg border border-black/5 border-l-4 shadow-sm",
        toneFor(shift.department?.color_token),
        isDragging && "opacity-70 shadow-md",
      )}
    >
      {canEdit ? (
        <button
          type="button"
          className="flex cursor-grab items-center px-0.5 text-current/50 hover:text-current"
          aria-label="გადატანა"
          {...listeners}
          {...attributes}
        >
          <GripVertical className="size-3.5" />
        </button>
      ) : null}
      <button type="button" className="min-w-0 flex-1 px-1.5 py-1.5 text-left" onClick={onEdit}>
        <span className="block text-[13px] font-semibold leading-tight">{formatShiftHours(shift.start_time, shift.end_time)}</span>
        <span className="mt-0.5 block truncate text-[10px] leading-tight opacity-75">{shift.position?.name ?? shift.department?.name}</span>
      </button>
    </div>
  );
}
