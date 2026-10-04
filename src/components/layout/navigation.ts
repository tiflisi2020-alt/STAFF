import {
  Bell,
  CalendarDays,
  ClipboardList,
  Clock3,
  Home,
  Palmtree,
  RefreshCw,
  Settings,
  Umbrella,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { AppRole } from "@/types/auth";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  mobile?: boolean;
};

export const adminNav: NavItem[] = [
  { href: "/", label: "მთავარი", icon: Home, mobile: true },
  { href: "/employees", label: "თანამშრომლები", icon: Users, mobile: true },
  { href: "/schedule", label: "გრაფიკი", icon: CalendarDays, mobile: true },
  { href: "/attendance", label: "დასწრება", icon: Clock3 },
  { href: "/time-off", label: "დასვენების მოთხოვნები", icon: Umbrella },
  { href: "/vacations", label: "შვებულებები", icon: Palmtree },
  { href: "/swaps", label: "ცვლის გაცვლა", icon: RefreshCw },
  { href: "/notifications", label: "შეტყობინებები", icon: Bell, mobile: true },
  { href: "/settings", label: "პარამეტრები", icon: Settings },
];

export const employeeNav: NavItem[] = [
  { href: "/", label: "მთავარი", icon: Home, mobile: true },
  { href: "/schedule", label: "ჩემი გრაფიკი", icon: CalendarDays, mobile: true },
  { href: "/attendance", label: "ჩემი დასწრება", icon: Clock3 },
  { href: "/requests", label: "ჩემი მოთხოვნები", icon: ClipboardList, mobile: true },
  { href: "/notifications", label: "შეტყობინებები", icon: Bell, mobile: true },
  { href: "/profile", label: "ჩემი პროფილი", icon: UserRound, mobile: true },
];

export function navigationFor(role: AppRole) {
  return role === "admin" ? adminNav : employeeNav;
}
