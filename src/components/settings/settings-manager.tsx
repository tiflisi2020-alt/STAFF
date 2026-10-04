"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteDepartment, deletePosition, saveDepartment, savePosition, saveRestaurantName } from "@/lib/actions/directory";
import { departmentSwatch } from "@/lib/format";
import {
  departmentSchema,
  positionSchema,
  restaurantSettingsSchema,
  type DepartmentValues,
  type PositionValues,
  type RestaurantSettingsValues,
} from "@/lib/validation/directory";
import type { Department, Position } from "@/types/database";

const fieldClass =
  "h-11 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function SettingsManager({
  restaurantName,
  departments,
  positions,
  error,
}: {
  restaurantName: string;
  departments: Department[];
  positions: Position[];
  error: string | null;
}) {
  return (
    <div className="space-y-8">
      <PageHeader title="პარამეტრები" description="რესტორნის სახელი, განყოფილებები და პოზიციები." />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <RestaurantNameForm name={restaurantName} />
      <DepartmentsBlock departments={departments} />
      <PositionsBlock departments={departments} positions={positions} />
    </div>
  );
}

function RestaurantNameForm({ name }: { name: string }) {
  const router = useRouter();
  const form = useForm<RestaurantSettingsValues>({
    resolver: zodResolver(restaurantSettingsSchema),
    defaultValues: { displayName: name },
  });
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(values: RestaurantSettingsValues) {
    setError(null);
    const result = await saveRestaurantName(values);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success(result.success ?? "შენახულია");
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-xl space-y-3 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-foreground/10">
      <h2 className="text-lg font-semibold">რესტორნის სახელი</h2>
      <Label htmlFor="displayName">სახელი</Label>
      <Input id="displayName" {...form.register("displayName")} />
      {form.formState.errors.displayName ? (
        <p className="text-sm text-destructive">{form.formState.errors.displayName.message}</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "მიმდინარეობს..." : "შენახვა"}
      </Button>
    </form>
  );
}

function DepartmentsBlock({ departments }: { departments: Department[] }) {
  const [editing, setEditing] = useState<Department | null | undefined>(undefined);
  const [removing, setRemoving] = useState<Department | null>(null);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">განყოფილებები</h2>
        <Button type="button" onClick={() => setEditing(null)}>
          დამატება
        </Button>
      </div>
      {departments.length === 0 ? (
        <EmptyState title="განყოფილება არ არის" />
      ) : (
        <div className="divide-y overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-foreground/10">
          {departments.map((department) => (
            <div key={department.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <p className="flex items-center gap-2 font-medium">
                <span className={`size-2 rounded-full ${departmentSwatch(department.color_token)}`} />
                {department.name}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setEditing(department)}>
                  რედაქტირება
                </Button>
                <Button type="button" variant="ghost" onClick={() => setRemoving(department)}>
                  წაშლა
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <NameDialog
        open={editing !== undefined}
        title={editing ? "განყოფილების რედაქტირება" : "განყოფილების დამატება"}
        label="დასახელება"
        defaultName={editing?.name ?? ""}
        onClose={() => setEditing(undefined)}
        onSave={async (name) => saveDepartment({ id: editing?.id, name })}
      />
      <DeleteDialog
        open={Boolean(removing)}
        title="განყოფილების წაშლა"
        description={removing ? `${removing.name} წაიშლება მხოლოდ მაშინ, თუ მას პოზიცია ან თანამშრომელი არ უკავშირდება.` : ""}
        onClose={() => setRemoving(null)}
        onConfirm={async () => (removing ? deleteDepartment(removing.id) : { error: "განყოფილება ვერ მოიძებნა." })}
      />
    </section>
  );
}

function PositionsBlock({ departments, positions }: { departments: Department[]; positions: Position[] }) {
  const [editing, setEditing] = useState<Position | null | undefined>(undefined);
  const [removing, setRemoving] = useState<Position | null>(null);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">პოზიციები</h2>
        <Button type="button" onClick={() => setEditing(null)} disabled={departments.length === 0}>
          დამატება
        </Button>
      </div>
      {departments.map((department) => {
        const rows = positions.filter((position) => position.department_id === department.id);
        return (
          <div key={department.id} className="space-y-2">
            <h3 className="font-medium">{department.name}</h3>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">პოზიცია არ არის</p>
            ) : (
              <div className="divide-y overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-foreground/10">
                {rows.map((position) => (
                  <div key={position.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <p>{position.name}</p>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setEditing(position)}>
                        რედაქტირება
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setRemoving(position)}>
                        წაშლა
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <PositionDialog
        position={editing === undefined ? undefined : editing}
        departments={departments}
        onClose={() => setEditing(undefined)}
      />
      <DeleteDialog
        open={Boolean(removing)}
        title="პოზიციის წაშლა"
        description={removing ? `${removing.name} წაიშლება, თუ ამ პოზიციაზე თანამშრომელი არ არის.` : ""}
        onClose={() => setRemoving(null)}
        onConfirm={async () => (removing ? deletePosition(removing.id) : { error: "პოზიცია ვერ მოიძებნა." })}
      />
    </section>
  );
}

function NameDialog({
  open,
  title,
  label,
  defaultName,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  label: string;
  defaultName: string;
  onClose: () => void;
  onSave: (name: string) => Promise<{ error?: string; success?: string }>;
}) {
  const router = useRouter();
  const form = useForm<DepartmentValues>({
    resolver: zodResolver(departmentSchema),
    values: { name: defaultName },
  });
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(values: DepartmentValues) {
    setError(null);
    const result = await onSave(values.name);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success(result.success ?? "შენახულია");
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <Label>{label}</Label>
          <Input {...form.register("name")} />
          {form.formState.errors.name ? <p className="text-sm text-destructive">{form.formState.errors.name.message}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
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

function PositionDialog({
  position,
  departments,
  onClose,
}: {
  position: Position | null | undefined;
  departments: Department[];
  onClose: () => void;
}) {
  const router = useRouter();
  const form = useForm<PositionValues>({
    resolver: zodResolver(positionSchema),
    values: {
      id: position?.id,
      departmentId: position?.department_id ?? departments[0]?.id ?? "",
      name: position?.name ?? "",
    },
  });
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(values: PositionValues) {
    setError(null);
    const result = await savePosition(values);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success(result.success ?? "შენახულია");
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={position !== undefined} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{position ? "პოზიციის რედაქტირება" : "პოზიციის დამატება"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <label className="space-y-2">
            <Label>განყოფილება</Label>
            <select className={fieldClass} {...form.register("departmentId")}>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <Label>დასახელება</Label>
            <Input {...form.register("name")} />
          </label>
          {form.formState.errors.name ? <p className="text-sm text-destructive">{form.formState.errors.name.message}</p> : null}
          {form.formState.errors.departmentId ? (
            <p className="text-sm text-destructive">{form.formState.errors.departmentId.message}</p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
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

function DeleteDialog({
  open,
  title,
  description,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => Promise<{ error?: string; success?: string }>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setPending(true);
    setError(null);
    const result = await onConfirm();
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success(result.success ?? "წაიშალა");
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            გაუქმება
          </Button>
          <Button type="button" variant="destructive" disabled={pending} onClick={confirm}>
            {pending ? "მიმდინარეობს..." : "წაშლა"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
