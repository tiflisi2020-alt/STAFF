import { CalendarDays } from "lucide-react";
import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-card shadow-[0_20px_60px_-36px_rgba(40,32,20,0.45)] ring-1 ring-foreground/10 lg:grid-cols-[1.05fr_0.95fr]">
        <aside className="relative hidden min-h-[32rem] flex-col justify-between overflow-hidden bg-primary px-10 py-12 text-primary-foreground lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_42%)]" />
          <div className="relative flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/20">
              <CalendarDays className="size-5" />
            </span>
            <div>
              <p className="text-sm text-primary-foreground/75">რესტორანი</p>
              <p className="text-lg font-semibold tracking-tight">პერსონალი</p>
            </div>
          </div>
          <div className="relative max-w-sm space-y-4">
            <h2 className="text-4xl font-semibold leading-tight tracking-tight text-balance">
              გრაფიკი, ცვლები და დასწრება ერთ სივრცეში.
            </h2>
            <p className="text-base leading-7 text-primary-foreground/80">
              მენეჯერი გეგმავს კვირას. თანამშრომელი ხედავს მხოლოდ საკუთარ ცვლას.
            </p>
          </div>
        </aside>

        <section className="flex flex-col justify-center px-5 py-8 sm:px-10 sm:py-12">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <CalendarDays className="size-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">რესტორანი</p>
              <p className="font-semibold">პერსონალი</p>
            </div>
          </div>

          <div className="mb-8 space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-balance">{title}</h1>
            <p className="text-base leading-7 text-muted-foreground">{description}</p>
          </div>

          {children}

          {footer ? <div className="mt-6 text-sm leading-6 text-muted-foreground">{footer}</div> : null}
        </section>
      </div>
    </div>
  );
}
