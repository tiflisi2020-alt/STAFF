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
import { eachDate, formatGeorgianDate, isoWeekday, weekdayLabel } from "@/lib/dates";
import { departmentSwatch, formatShiftHours, fullName } from "@/lib/format";
import type { WeekBoard } from "@/lib/demo/operations";
import type { ShiftRow } from "@/types/database";

const fieldClass =
  "h-11 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const shortDays = ["", "ორ", "სამ", "ოთხ", "ხუთ", "პარ", "შაბ", "კვი"];

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
                        className="flex w-full items-center gap-2 rounded-xl bg-muted px-3 py-2 text-left text-sm"
                        onClick={() => isAdmin && openEdit(shift)}
                      >
                        <span className={`size-2.5 rounded-full ${departmentSwatch(shift.department?.color_token)}`} />
                        {formatShiftHours(shift.start_time, shift.end_time)}
                      </button>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>

          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <div className="hidden overflow-x-auto rounded-2xl bg-card shadow-sm ring-1 ring-foreground/10 md:block">
              <div className="grid min-w-[860px] grid-cols-[180px_repeat(7,minmax(0,1fr))]">
                <div className="border-b border-r px-3 py-3 text-xs text-muted-foreground">თანამშრომელი</div>
                {days.map((date) => (
                  <div key={date} className="border-b px-2 py-3 text-center text-xs">
                    <p className="font-medium">{shortDays[isoWeekday(date)]}</p>
                    <p className="text-muted-foreground">{date.slice(8)}</p>
                  </div>
                ))}
                {board.employees.map((employee) => (
                  <EmployeeRow
                    key={employee.id}
                    employeeName={fullName(employee)}
                    position={employee.position?.name ?? ""}
                    days={days}
                    shifts={board.shifts.filter((shift) => shift.employee_id === employee.id)}
                    employeeId={employee.id}
                    canEdit={isAdmin}
                    onEdit={openEdit}
                    onCreate={(date) => openCreate(employee.id, date)}
                  />
                ))}
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
  position,
  days,
  shifts,
  employeeId,
  canEdit,
  onEdit,
  onCreate,
}: {
  employeeName: string;
  position: string;
  days: string[];
  shifts: ShiftRow[];
  employeeId: string;
  canEdit: boolean;
  onEdit: (shift: ShiftRow) => void;
  onCreate: (date: string) => void;
}) {
  return (
    <>
      <div className="border-r border-t px-3 py-3">
        <p className="text-sm font-medium">{employeeName}</p>
        <p className="text-xs text-muted-foreground">{position}</p>
      </div>
      {days.map((date) => (
        <DayCell
          key={`${employeeId}-${date}`}
          id={`${employeeId}|${date}`}
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
  shifts,
  canEdit,
  onEdit,
  onCreate,
}: {
  id: string;
  shifts: ShiftRow[];
  canEdit: boolean;
  onEdit: (shift: ShiftRow) => void;
  onCreate: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !canEdit });
  return (
    <div ref={setNodeRef} className={`min-h-24 space-y-1 border-t p-1.5 ${isOver ? "bg-primary/10" : ""}`}>
      {shifts.map((shift) => (
        <ShiftChip key={shift.id} shift={shift} canEdit={canEdit} onEdit={() => onEdit(shift)} />
      ))}
      {canEdit ? (
        <button type="button" className="w-full rounded-md px-1 py-1 text-left text-xs text-muted-foreground hover:bg-muted" onClick={onCreate}>
          +
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
      className={`flex items-center gap-1 rounded-lg bg-muted px-1.5 py-1 text-xs ${isDragging ? "opacity-60" : ""}`}
    >
      {canEdit ? (
        <button type="button" className="cursor-grab text-muted-foreground" aria-label="გადატანა" {...listeners} {...attributes}>
          <GripVertical className="size-3.5" />
        </button>
      ) : null}
      <button type="button" className="min-w-0 flex-1 truncate text-left" onClick={onEdit}>
        <span className={`mr-1 inline-block size-2 rounded-full ${departmentSwatch(shift.department?.color_token)}`} />
        {formatShiftHours(shift.start_time, shift.end_time)}
      </button>
    </div>
  );
}
