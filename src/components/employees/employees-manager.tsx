"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveEmployee, setEmployeeActive } from "@/lib/actions/employees";
import { departmentSwatch, fullName, initials } from "@/lib/format";
import { employeeSchema, type EmployeeValues } from "@/lib/validation/employee";
import type { Department, Employee, Position } from "@/types/database";

const fieldClass =
  "h-11 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type Filters = {
  q: string;
  departmentId: string;
  positionId: string;
  status: string;
};

export function EmployeesManager({
  employees,
  departments,
  positions,
  filters,
  error,
}: {
  employees: Employee[];
  departments: Department[];
  positions: Position[];
  filters: Filters;
  error: string | null;
}) {
  const [editing, setEditing] = useState<Employee | null | undefined>(undefined);
  const [confirming, setConfirming] = useState<Employee | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="თანამშრომლები"
        description="მოძებნეთ, გაფილტრეთ და მართეთ რესტორნის გუნდი."
        action={
          <Button type="button" size="lg" className="h-11" onClick={() => setEditing(null)}>
            თანამშრომლის დამატება
          </Button>
        }
      />

      {error ? <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}

      <form action="/employees" className="grid gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-foreground/10 md:grid-cols-4">
        <label className="space-y-2 md:col-span-4">
          <span className="text-sm font-medium">ძებნა</span>
          <Input name="q" defaultValue={filters.q} aria-label="თანამშრომლის ძებნა" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">განყოფილება</span>
          <select name="department" defaultValue={filters.departmentId} className={fieldClass}>
            <option value="">ყველა</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">პოზიცია</span>
          <select name="position" defaultValue={filters.positionId} className={fieldClass}>
            <option value="">ყველა</option>
            {positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">სტატუსი</span>
          <select name="status" defaultValue={filters.status} className={fieldClass}>
            <option value="">ყველა</option>
            <option value="active">აქტიური</option>
            <option value="inactive">არააქტიური</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <Button type="submit" variant="secondary" className="h-11">
            გაფილტვრა
          </Button>
          <Link href="/employees" className="inline-flex h-11 items-center text-sm text-primary">
            გასუფთავება
          </Link>
        </div>
      </form>

      {employees.length === 0 ? (
        <EmptyState title="თანამშრომელი ვერ მოიძებნა" description="შეცვალეთ ფილტრი ან დაამატეთ ახალი თანამშრომელი." />
      ) : (
        <div className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-foreground/10">
          <div className="hidden grid-cols-[1.5fr_1fr_1fr_0.8fr_auto] gap-3 border-b px-4 py-3 text-xs text-muted-foreground lg:grid">
            <span>თანამშრომელი</span>
            <span>პოზიცია</span>
            <span>განყოფილება</span>
            <span>სტატუსი</span>
            <span>მოქმედება</span>
          </div>
          <div className="divide-y">
            {employees.map((employee) => (
              <div key={employee.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[1.5fr_1fr_1fr_0.8fr_auto] lg:items-center">
                <div className="flex items-center gap-3">
                  <Avatar size="lg">
                    {employee.avatar_url ? <AvatarImage src={employee.avatar_url} alt="" /> : null}
                    <AvatarFallback>{initials(employee.first_name, employee.last_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <Link href={`/employees/${employee.id}`} className="font-medium hover:underline">
                      {fullName(employee)}
                    </Link>
                    <p className="text-sm text-muted-foreground">{employee.phone || employee.email || "კონტაქტი არ არის"}</p>
                  </div>
                </div>
                <p>{employee.position?.name ?? "—"}</p>
                <p className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${departmentSwatch(employee.department?.color_token)}`} />
                  {employee.department?.name ?? "—"}
                </p>
                <StatusBadge status={employee.is_active ? "active" : "inactive"} />
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditing(employee)}>
                    რედაქტირება
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setConfirming(employee)}>
                    {employee.is_active ? "გათიშვა" : "გააქტიურება"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <EmployeeDialog
        employee={editing === undefined ? undefined : editing}
        departments={departments}
        positions={positions}
        onClose={() => setEditing(undefined)}
      />
      <ActiveDialog employee={confirming} onClose={() => setConfirming(null)} />
    </div>
  );
}

function EmployeeDialog({
  employee,
  departments,
  positions,
  onClose,
}: {
  employee: Employee | null | undefined;
  departments: Department[];
  positions: Position[];
  onClose: () => void;
}) {
  const router = useRouter();
  const open = employee !== undefined;
  const form = useForm<EmployeeValues>({
    resolver: zodResolver(employeeSchema),
    values: {
      id: employee?.id,
      firstName: employee?.first_name ?? "",
      lastName: employee?.last_name ?? "",
      phone: employee?.phone ?? "",
      email: employee?.email ?? "",
      avatarUrl: employee?.avatar_url ?? "",
      departmentId: employee?.department_id ?? "",
      positionId: employee?.position_id ?? "",
      isActive: employee?.is_active ?? true,
      notes: employee?.notes ?? "",
    },
  });
  const departmentId = form.watch("departmentId");
  const visiblePositions = useMemo(
    () => positions.filter((position) => position.department_id === departmentId),
    [positions, departmentId],
  );
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(values: EmployeeValues) {
    setFormError(null);
    const result = await saveEmployee(values);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    toast.success(result.success ?? "შენახულია");
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{employee ? "თანამშრომლის რედაქტირება" : "თანამშრომლის დამატება"}</DialogTitle>
          <DialogDescription>შეავსეთ ძირითადი მონაცემები. ხელფასის ველები აქ არ არის.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          {formError ? <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">{formError}</p> : null}
          <Field label="სახელი" error={form.formState.errors.firstName?.message}>
            <Input aria-invalid={Boolean(form.formState.errors.firstName)} {...form.register("firstName")} />
          </Field>
          <Field label="გვარი" error={form.formState.errors.lastName?.message}>
            <Input aria-invalid={Boolean(form.formState.errors.lastName)} {...form.register("lastName")} />
          </Field>
          <Field label="ტელეფონი" error={form.formState.errors.phone?.message}>
            <Input aria-invalid={Boolean(form.formState.errors.phone)} {...form.register("phone")} />
          </Field>
          <Field label="ელფოსტა" error={form.formState.errors.email?.message}>
            <Input type="email" aria-invalid={Boolean(form.formState.errors.email)} {...form.register("email")} />
          </Field>
          <Field label="ფოტოს ბმული" error={form.formState.errors.avatarUrl?.message} className="sm:col-span-2">
            <Input aria-invalid={Boolean(form.formState.errors.avatarUrl)} {...form.register("avatarUrl")} />
          </Field>
          <Field label="განყოფილება" error={form.formState.errors.departmentId?.message}>
            <select
              className={fieldClass}
              aria-invalid={Boolean(form.formState.errors.departmentId)}
              {...form.register("departmentId", {
                onChange: () => form.setValue("positionId", ""),
              })}
            >
              <option value="">აირჩიეთ</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="პოზიცია" error={form.formState.errors.positionId?.message}>
            <select className={fieldClass} aria-invalid={Boolean(form.formState.errors.positionId)} {...form.register("positionId")}>
              <option value="">აირჩიეთ</option>
              {visiblePositions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.name}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" className="size-4" {...form.register("isActive")} />
            აქტიური
          </label>
          <Field label="შენიშვნა" error={form.formState.errors.notes?.message} className="sm:col-span-2">
            <Textarea className="min-h-24 text-base" {...form.register("notes")} />
          </Field>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>
              გაუქმება
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "მიმდინარეობს..." : "შენახვა"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ActiveDialog({ employee, onClose }: { employee: Employee | null; onClose: () => void }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!employee) {
      return;
    }
    setPending(true);
    setError(null);
    const result = await setEmployeeActive(employee.id, !employee.is_active);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success(result.success ?? "შენახულია");
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={Boolean(employee)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{employee?.is_active ? "თანამშრომლის გათიშვა" : "თანამშრომლის გააქტიურება"}</DialogTitle>
          <DialogDescription>
            {employee ? `${fullName(employee)} დარჩება სისტემაში, მაგრამ სიაში სტატუსი შეიცვლება.` : ""}
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            გაუქმება
          </Button>
          <Button type="button" disabled={pending} onClick={confirm}>
            {pending ? "მიმდინარეობს..." : "დადასტურება"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`space-y-2 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {error ? <span className="block text-sm leading-6 text-destructive">{error}</span> : null}
    </label>
  );
}
