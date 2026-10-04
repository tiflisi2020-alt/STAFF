"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { navigationFor, type NavItem } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { AppRole } from "@/types/auth";
import { cn } from "cn";

type AppShellProps = {
  role: AppRole;
  restaurantName: string;
  personName: string;
  unreadCount: number;
  demoMode?: boolean;
  children: React.ReactNode;
};

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ role, restaurantName, personName, unreadCount, demoMode = false, children }: AppShellProps) {
  const pathname = usePathname();
  const items = navigationFor(role);
  const mobileItems = items.filter((item) => item.mobile);
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-background md:grid md:grid-cols-[4.75rem_minmax(0,1fr)] lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="px-3 py-6 lg:px-5">
          <p className="text-center text-lg font-semibold lg:hidden">პ</p>
          <p className="hidden text-xs text-muted-foreground lg:block">რესტორანი</p>
          <p className="mt-1 hidden text-lg font-semibold tracking-tight lg:block">{restaurantName}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {items.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(pathname, item.href)}
              badge={item.href === "/notifications" ? unreadCount : 0}
            />
          ))}
        </nav>
        <div className="space-y-3 border-t border-sidebar-border p-3 lg:p-4">
          <p className="hidden truncate text-sm font-medium lg:block">{personName}</p>
          <LogoutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur md:hidden">
          <div>
            <p className="text-xs text-muted-foreground">რესტორანი</p>
            <p className="font-semibold">{restaurantName}</p>
          </div>
          <Button type="button" variant="outline" size="icon" aria-label="მენიუ" onClick={() => setOpen(true)}>
            <Menu />
          </Button>
        </header>

        <main className="flex-1 px-4 py-6 pb-24 sm:px-6 md:pb-10 lg:px-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
            {demoMode ? (
              <p className="rounded-xl bg-primary/10 px-4 py-3 text-sm leading-6 text-primary">
                სატესტო რეჟიმი. მონაცემები მხოლოდ ამ კომპიუტერზე ინახება.
              </p>
            ) : null}
            {children}
          </div>
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card/95 px-1 py-2 backdrop-blur md:hidden">
          {mobileItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-1 py-1 text-[11px] leading-4",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span className="relative">
                  <Icon className="size-5" />
                  {item.href === "/notifications" && unreadCount > 0 ? (
                    <span className="absolute -top-1 -right-2 rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                      {unreadCount}
                    </span>
                  ) : null}
                </span>
                <span className="max-w-full truncate">{item.label.replace("ჩემი ", "")}</span>
              </Link>
            );
          })}
          {role === "admin" ? (
            <button
              type="button"
              className="flex flex-col items-center gap-1 rounded-xl px-1 py-1 text-[11px] leading-4 text-muted-foreground"
              onClick={() => setOpen(true)}
            >
              <Menu className="size-5" />
              <span>მენიუ</span>
            </button>
          ) : null}
        </nav>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[18rem] sm:max-w-xs">
          <SheetHeader>
            <SheetTitle>{restaurantName}</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 px-3">
            {items.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isActive(pathname, item.href)}
                badge={item.href === "/notifications" ? unreadCount : 0}
                onNavigate={() => setOpen(false)}
              />
            ))}
          </nav>
          <div className="mt-auto space-y-3 p-4">
            <p className="text-sm font-medium">{personName}</p>
            <LogoutButton />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  badge,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: NavItem["icon"];
  active: boolean;
  badge: number;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm leading-5 transition-colors lg:justify-start",
        active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="hidden flex-1 lg:inline">{label}</span>
      {badge > 0 ? (
        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[11px] leading-4 text-primary-foreground">{badge}</span>
      ) : null}
    </Link>
  );
}
