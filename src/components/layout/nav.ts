import { ArrowLeftRight, CalendarClock, LayoutDashboard, LineChart, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/subscriptions", label: "Subscriptions", icon: CalendarClock },
  { href: "/portfolio", label: "Portfolio", icon: LineChart },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
