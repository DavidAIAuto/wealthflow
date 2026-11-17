"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickAddTrigger } from "./QuickAddTrigger";
import { NAV_ITEMS, isActivePath } from "./nav";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r bg-sidebar px-4 py-6 md:flex">
      <Link href="/" className="flex items-center gap-2 px-2 font-semibold">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Wallet className="size-4" />
        </span>
        Finance
      </Link>
      <QuickAddTrigger className="w-full" />
      <nav className="flex flex-col gap-1" aria-label="Main">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
