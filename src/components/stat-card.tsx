import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <article className="surface flex items-start justify-between gap-3 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl leading-none font-semibold tracking-tight">{value}</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
      </div>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
    </article>
  );
}
