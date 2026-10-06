"use client";

import { Bell, ChevronRight, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { navigationFor, type NavItem } from "@/components/layout/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { signOut } from "@/lib/auth/actions";
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

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "პ";
  }
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("");
}

function currentCrumb(pathname: string, items: NavItem[]) {
  if (pathname.startsWith("/employees/")) {
    return { parent: "თანამშრომლები", parentHref: "/employees", current: "პროფილი" };
  }
  const match = [...items].reverse().find((item) => isActive(pathname, item.href));
  if (!match || match.href === "/") {
    return { current: "მთავარი" };
  }
  return { parent: "მთავარი", parentHref: "/", current: match.label };
}

export function AppShell({ role, restaurantName, personName, unreadCount, demoMode = false, children }: AppShellProps) {
  const pathname = usePathname();
  const items = navigationFor(role);
  const mobileItems = items.filter((item) => item.mobile);
  const [open, setOpen] = useState(false);
  const roleLabel = role === "admin" ? "მენეჯერი" : "თანამშრომელი";
  const crumb = currentCrumb(pathname, items);
  const wide = pathname.startsWith("/schedule");

  return (
    <div className="min-h-dvh bg-background md:grid md:grid-cols-[15.5rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-sidebar-border/80 bg-sidebar md:flex">
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
              ტ
            </span>
            <div className="min-w-0">
              <p className="text-[11px] text-gold">რესტორანი</p>
              <p className="truncate text-base leading-5 font-semibold">{restaurantName}</p>
            </div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-3">
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
        <div className="border-t border-sidebar-border/80 p-3">
          <div className="mb-2 flex items-center gap-2.5 px-1.5">
            <Avatar>
              <AvatarFallback>{initialsFrom(personName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{personName}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
          </div>
          <LogoutButton compact />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border/80 bg-background/85 px-4 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Button type="button" variant="ghost" size="icon" className="md:hidden" aria-label="მენიუ" onClick={() => setOpen(true)}>
              <Menu />
            </Button>
            <nav aria-label="მდებარეობა" className="flex min-w-0 items-center gap-1.5 text-sm">
              {crumb.parent && crumb.parentHref ? (
                <>
                  <Link href={crumb.parentHref} className="truncate text-muted-foreground hover:text-foreground">
                    {crumb.parent}
                  </Link>
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                </>
              ) : null}
              <span className="truncate font-medium">{crumb.current}</span>
            </nav>
          </div>

          <div className="flex items-center gap-1">
            <Link
              href="/notifications"
              aria-label="შეტყობინებები"
              className="relative inline-flex size-10 items-center justify-center rounded-xl text-foreground/80 transition-colors hover:bg-muted"
            >
              <Bell className="size-4" />
              {unreadCount > 0 ? (
                <span className="absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 text-primary-foreground">
                  {unreadCount}
                </span>
              ) : null}
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex items-center gap-2 rounded-xl py-1 pr-1 pl-1 transition-colors hover:bg-muted"
                aria-label="მომხმარებლის მენიუ"
              >
                <Avatar size="sm">
                  <AvatarFallback>{initialsFrom(personName)}</AvatarFallback>
                </Avatar>
                <span className="hidden text-left sm:block">
                  <span className="block max-w-36 truncate text-sm leading-4 font-medium">{personName}</span>
                  <span className="block text-[11px] leading-4 text-muted-foreground">{roleLabel}</span>
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                  <span className="block truncate text-sm text-foreground">{personName}</span>
                  <span className="block text-xs font-normal">{roleLabel}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {role === "employee" ? (
                  <DropdownMenuItem render={<Link href="/profile" />}>პროფილი</DropdownMenuItem>
                ) : (
                  <DropdownMenuItem render={<Link href="/settings" />}>პარამეტრები</DropdownMenuItem>
                )}
                <DropdownMenuItem render={<Link href="/notifications" />}>შეტყობინებები</DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action={signOut}>
                  <button type="submit" className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-sm hover:bg-muted">
                    <LogOut className="size-4" />
                    გასვლა
                  </button>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 pb-24 sm:px-6 md:pb-10 lg:px-8">
          <div className={cn("mx-auto flex w-full flex-col gap-6", wide ? "max-w-[92rem]" : "max-w-6xl")}>
            {demoMode ? (
              <p className="rounded-xl border border-primary/15 bg-primary/10 px-4 py-2.5 text-sm leading-6 text-primary">
                სატესტო რეჟიმი. მონაცემები მხოლოდ ამ კომპიუტერზე ინახება.
              </p>
            ) : null}
            {children}
          </div>
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border/80 bg-card/95 px-1 py-1.5 backdrop-blur md:hidden">
          {mobileItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl px-1 py-1 text-[11px] leading-4",
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
              className="flex flex-col items-center gap-0.5 rounded-xl px-1 py-1 text-[11px] leading-4 text-muted-foreground"
              onClick={() => setOpen(true)}
            >
              <Menu className="size-5" />
              <span>მენიუ</span>
            </button>
          ) : null}
        </nav>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[18.5rem] bg-sidebar sm:max-w-xs">
          <SheetHeader>
            <SheetTitle>{restaurantName}</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-0.5 px-3">
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
          <div className="mt-auto space-y-3 border-t border-sidebar-border p-4">
            <div>
              <p className="text-sm font-medium">{personName}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
            <LogoutButton compact />
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
        "relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] leading-5 transition-colors",
        active ? "bg-primary/10 font-medium text-primary" : "text-foreground/75 hover:bg-muted hover:text-foreground",
      )}
    >
      {active ? <span className="absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" /> : null}
      <Icon className="size-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {badge > 0 ? (
        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[11px] leading-4 text-primary-foreground">{badge}</span>
      ) : null}
    </Link>
  );
}
