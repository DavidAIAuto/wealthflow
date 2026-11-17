"use client";

import { addMonths, format, parse } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{label}</span>
          {icon}
        </div>
        <div className={cn("text-2xl font-semibold tabular-nums tracking-tight", valueClassName)}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export function CategoryBadge({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs">
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="truncate">{name}</span>
    </span>
  );
}

/** Prev / next month stepper for a "yyyy-MM" key. */
export function MonthStepper({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const d = parse(value, "yyyy-MM", new Date());
  const step = (n: number) => onChange(format(addMonths(d, n), "yyyy-MM"));
  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" onClick={() => step(-1)} aria-label="Previous month">
        <ChevronLeft />
      </Button>
      <div className="min-w-36 text-center text-sm font-medium">{format(d, "MMMM yyyy")}</div>
      <Button variant="outline" size="icon" onClick={() => step(1)} aria-label="Next month">
        <ChevronRight />
      </Button>
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="py-10 text-center text-sm text-muted-foreground">{children}</div>;
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
      {message}
    </div>
  );
}
