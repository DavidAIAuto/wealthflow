"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickAddTrigger } from "./QuickAddTrigger";
import { NAV_ITEMS, isActivePath } from "./nav";

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur md:hidden">
      <Link href="/" className="flex items-center gap-2 font-semibold">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Wallet className="size-4" />
        </span>
        Finance
      </Link>
      <QuickAddTrigger compact />
    </header>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActivePath(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 text-[11px]",
              active ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
            <span className="max-w-full truncate px-0.5">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
