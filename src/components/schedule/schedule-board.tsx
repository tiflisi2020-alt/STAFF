"use client";

import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ChevronLeft, ChevronRight, GripVertical, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { applyWeekTemplate, copyPreviousWeek, deleteShift, moveShift, publishWeek, saveShift, saveWeekTemplate } from "@/lib/actions/modules";
import { eachDate, formatGeorgianDate, isoWeekday, todayInTimeZone, weekdayLabel } from "@/lib/dates";
import { departmentSwatch, formatShiftHours, fullName, initials } from "@/lib/format";
import type { WeekBoard } from "@/lib/demo/operations";
import type { ShiftRow } from "@/types/database";
import { cn } from "cn";

const fieldClass = "field";

const shortDays = ["", "ორშ", "სამ", "ოთხ", "ხუთ", "პარ", "შაბ", "კვ"];

const shiftTone: Record<string, string> = {
  kitchen: "border-l-[#8d6b45] bg-[#f8f4ee] text-[#4a3b28]",
  hall: "border-l-[#2f5d45] bg-[#f3f7f4] text-[#1e3a2c]",
  bar: "border-l-[#6d5a45] bg-[#f7f4ef] text-[#3f3428]",
  office: "border-l-[#7a736a] bg-[#f6f5f3] text-[#3d3935]",
  neutral: "border-l-primary bg-primary/6 text-foreground",
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

export function ScheduleBoard({
  board,
  isAdmin,
  templates = [],
  initialCreate = false,
}: {
  board: WeekBoard;
  isAdmin: boolean;
  templates?: { id: string; name: string; shiftCount: number }[];
  initialCreate?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [applyTemplateOpen, setApplyTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("ჩვეულებრივი კვირა");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [mobileDay, setMobileDay] = useState(board.weekStart);
  const [view, setView] = useState<"day" | "week" | "agenda">("week");
  const created = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) {
      setView("day");
    }
  }, []);
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
        setSaveTemplateOpen(false);
        setApplyTemplateOpen(false);
      }
      router.refresh();
    });
  }

  useEffect(() => {
    if (!initialCreate || !isAdmin || created.current) {
      return;
    }
    created.current = true;
    const person = board.employees[0];
    setDraft({
      employeeId: "",
      departmentId: person?.department_id ?? board.departments[0]?.id ?? "",
      positionId: "",
      shiftDate: board.weekStart,
      startTime: "10:00",
      endTime: "18:00",
      breakMinutes: 0,
      notes: "",
    });
  }, [board.departments, board.employees, board.weekStart, initialCreate, isAdmin]);

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
    <>
    <PrintSheet board={board} />
    <div className="schedule-screen space-y-6">
      <PageHeader
        title={isAdmin ? "გრაფიკი" : "ჩემი გრაფიკი"}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin ? (
              <Button type="button" variant="outline" onClick={() => setCopyOpen(true)}>
                წინა კვირის კოპირება
              </Button>
            ) : null}
            {isAdmin ? (
              <Button type="button" onClick={() => openCreate()}>
                <Plus />
                ახალი ცვლა
              </Button>
            ) : null}
            {isAdmin ? (
              <Button type="button" disabled={pending} onClick={() => run(publishWeek(board.weekStart), false)}>
                გრაფიკის გამოქვეყნება
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger className={buttonVariants({ variant: "outline" })}>სხვა</DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isAdmin ? <DropdownMenuItem onClick={() => setSaveTemplateOpen(true)}>შაბლონად შენახვა</DropdownMenuItem> : null}
                {isAdmin ? <DropdownMenuItem onClick={() => setApplyTemplateOpen(true)}>შაბლონით შევსება</DropdownMenuItem> : null}
                <DropdownMenuItem onClick={() => window.print()}>ბეჭდვა</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" aria-label="წინა კვირა" render={<Link href={previous} />}>
            <ChevronLeft />
          </Button>
          <p className="min-w-44 text-center text-sm font-medium">
            {formatGeorgianDate(board.weekStart)} – {formatGeorgianDate(board.weekEnd)}
          </p>
          <Button variant="outline" size="icon" aria-label="შემდეგი კვირა" render={<Link href={next} />}>
            <ChevronRight />
          </Button>
          <Button variant="ghost" render={<Link href="/schedule" />}>
            ეს კვირა
          </Button>
          <StatusBadge status={board.status} />
        </div>
        <div className="inline-flex w-fit shrink-0 rounded-xl bg-muted p-1">
          {(
            [
              ["day", "დღე"],
              ["week", "კვირა"],
              ["agenda", "თვე"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm transition-colors",
                view === value ? "bg-card font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setView(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {board.warnings.length > 0 ? (
        <div className="surface divide-y divide-warning-foreground/10 overflow-hidden bg-warning text-sm leading-6 text-warning-foreground">
          {board.warnings.map((warning) => (
            <p key={warning.id} className="px-4 py-2.5">
              {warning.message}
            </p>
          ))}
        </div>
      ) : null}

      {board.employees.length === 0 ? (
        <EmptyState title="აქტიური თანამშრომელი არ არის" description="ჯერ დაამატეთ თანამშრომელი, შემდეგ დაგეგმეთ ცვლები." />
      ) : (
        <>
          <div className={cn("space-y-3", view !== "day" && "hidden")}>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {days.map((date) => {
                const active = mobileDay === date;
                return (
                  <button
                    key={date}
                    type="button"
                    className={cn(
                      "shrink-0 rounded-xl px-3 py-2 text-left",
                      active ? "bg-primary text-primary-foreground" : "surface text-foreground",
                    )}
                    onClick={() => setMobileDay(date)}
                  >
                    <span className={cn("block text-[11px]", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {shortDays[isoWeekday(date)]}
                    </span>
                    <span className="text-sm font-medium">{date.slice(8)}</span>
                  </button>
                );
              })}
            </div>
            {board.employees.map((employee) => {
              const shifts = board.shifts.filter((shift) => shift.employee_id === employee.id && shift.shift_date === mobileDay);
              return (
                <article key={employee.id} className="surface p-4">
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

          <div className={cn("space-y-3", view !== "agenda" && "hidden")}>
            {days.map((date) => {
              const dayShifts = board.shifts.filter((shift) => shift.shift_date === date && shift.status !== "cancelled");
              return (
                <section key={date} className="surface p-4">
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <h3 className="font-medium">
                      {weekdayLabel(isoWeekday(date))}
                      <span className="ml-2 text-sm font-normal text-muted-foreground">{formatGeorgianDate(date)}</span>
                    </h3>
                    {date === today ? <span className="text-xs font-medium text-primary">დღეს</span> : null}
                  </div>
                  {dayShifts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">ცვლა არ არის</p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {dayShifts.map((shift) => {
                        const person = board.employees.find((employee) => employee.id === shift.employee_id);
                        return (
                          <button
                            key={shift.id}
                            type="button"
                            className={cn("rounded-xl border border-transparent border-l-4 px-3 py-2.5 text-left", toneFor(shift.department?.color_token))}
                            onClick={() => isAdmin && openEdit(shift)}
                          >
                            <span className="block text-sm font-medium">{person ? fullName(person) : "თანამშრომელი"}</span>
                            <span className="mt-0.5 block text-sm">{formatShiftHours(shift.start_time, shift.end_time)}</span>
                            <span className="block text-xs opacity-75">{shift.position?.name ?? shift.department?.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          <div className={cn("flex flex-wrap gap-3", view !== "week" && "hidden")}>
            {board.departments.map((department) => (
              <span key={department.id} className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <span className={cn("size-2.5 rounded-full", departmentSwatch(department.color_token))} />
                {department.name}
              </span>
            ))}
          </div>

          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <div className={cn("surface overflow-hidden", view !== "week" && "hidden")}>
              <div className="overflow-x-auto">
                <div className="grid min-w-[1080px] grid-cols-[220px_repeat(7,minmax(7.5rem,1fr))] gap-px bg-border/70">
                  <div className="sticky left-0 z-20 bg-muted/60 px-4 py-3 text-xs font-medium text-muted-foreground">
                    თანამშრომელი
                  </div>
                  {days.map((date) => {
                    const weekday = isoWeekday(date);
                    const isToday = date === today;
                    return (
                      <div
                        key={date}
                        className={cn(
                          "bg-card px-2 py-3 text-center",
                          isToday && "bg-primary/10",
                          !isToday && weekday >= 6 && "bg-muted/50",
                        )}
                      >
                        <p className={cn("text-[11px]", isToday ? "font-medium text-primary" : "text-muted-foreground")}>
                          {shortDays[weekday]}
                        </p>
                        <p className="text-lg font-semibold leading-tight">{date.slice(8)}</p>
                        {isToday ? <p className="text-[11px] font-medium text-primary">დღეს</p> : null}
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
        <DialogContent className="sm:max-w-lg">
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

      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>კვირის შაბლონი</DialogTitle>
            <DialogDescription>ეს კვირა ერთხელ ინახება და მერე სხვა კვირაში ერთი ღილაკით ივსება.</DialogDescription>
          </DialogHeader>
          <Input value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="მაგალითად, ჩვეულებრივი კვირა" />
          <DialogFooter>
            <Button type="button" disabled={pending} onClick={() => run(saveWeekTemplate(templateName, board.weekStart))}>
              შენახვა
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={applyTemplateOpen} onOpenChange={setApplyTemplateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>შაბლონით შევსება</DialogTitle>
            <DialogDescription>აირჩიეთ შენახული კვირა. იგივე სახელის შაბლონი ხელახლა შენახვისას ახლდება.</DialogDescription>
          </DialogHeader>
          <select className={fieldClass} value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
            {templates.length === 0 ? <option value="">შაბლონი ჯერ არ არის</option> : null}
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} · {template.shiftCount} ცვლა
              </option>
            ))}
          </select>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending || !templateId}
              onClick={() => run(applyWeekTemplate(templateId, board.weekStart, "merge"))}
            >
              დამატება
            </Button>
            <Button
              type="button"
              disabled={pending || !templateId}
              onClick={() => run(applyWeekTemplate(templateId, board.weekStart, "replace"))}
            >
              ჩანაცვლება
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}

function PrintSheet({ board }: { board: WeekBoard }) {
  const days = eachDate(board.weekStart, board.weekEnd);
  return (
    <section className="print-sheet">
      <h1 className="text-2xl font-semibold">
        გრაფიკი · {formatGeorgianDate(board.weekStart)} – {formatGeorgianDate(board.weekEnd)}
      </h1>
      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border px-2 py-2 text-left">თანამშრომელი</th>
            {days.map((day) => (
              <th key={day} className="border px-2 py-2 text-left">
                {weekdayLabel(isoWeekday(day))}
                <br />
                {formatGeorgianDate(day)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {board.employees.map((employee) => (
            <tr key={employee.id}>
              <td className="border px-2 py-2 font-medium">{fullName(employee)}</td>
              {days.map((day) => {
                const shifts = board.shifts.filter(
                  (shift) => shift.employee_id === employee.id && shift.shift_date === day && shift.status !== "cancelled",
                );
                return (
                  <td key={day} className="border px-2 py-2">
                    {shifts.length > 0 ? shifts.map((shift) => formatShiftHours(shift.start_time, shift.end_time)).join(", ") : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
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
      <div className={cn("sticky left-0 z-10 bg-card px-3 py-3", striped && "bg-muted/30")}>
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-medium text-primary">
            {initialsText}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-sm font-medium">
              <span className={cn("size-1.5 shrink-0 rounded-full", departmentSwatch(departmentToken))} />
              <span className="truncate">{employeeName}</span>
            </p>
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
        "group min-h-28 space-y-1.5 bg-card p-1.5 transition-colors",
        isToday && "bg-primary/[0.04]",
        !isToday && weekend && "bg-muted/40",
        !isToday && !weekend && striped && "bg-muted/20",
        isOver && "bg-primary/10 ring-2 ring-inset ring-primary/40",
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
        "flex items-stretch overflow-hidden rounded-xl border border-black/5 border-l-[3px] shadow-[0_1px_2px_rgba(48,36,22,0.05)] transition-shadow hover:shadow-md",
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
        <span className="block text-[13px] font-medium leading-tight">{formatShiftHours(shift.start_time, shift.end_time)}</span>
        <span className="mt-0.5 block truncate text-[11px] leading-tight opacity-75">{shift.position?.name ?? shift.department?.name}</span>
      </button>
    </div>
  );
}
