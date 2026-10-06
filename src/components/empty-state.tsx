import { CalendarOff } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="surface flex flex-col items-center px-6 py-8 text-center">
      <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon ?? <CalendarOff className="size-5" />}
      </div>
      <p className="text-base font-medium">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
