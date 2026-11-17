"use client";

import { AlertTriangle, OctagonAlert } from "lucide-react";
import { EmptyState } from "@/components/shared/bits";
import type { CategorySpend } from "@/lib/finance";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Horizontal bars: actual spend per category with a budget tick. Bars share one
 * hue (magnitude); over/near-budget rows switch to a status color AND show an
 * icon + label, so status is never color-alone.
 */
export function CategorySpendChart({ data, currency }: { data: CategorySpend[]; currency: string }) {
  if (data.length === 0) return <EmptyState>No expenses this month.</EmptyState>;
  const max = Math.max(...data.map((d) => Math.max(d.spent, d.budget ?? 0))) || 1;

  return (
    <ul className="grid gap-3" aria-label="Spending by category">
      {data.map((d) => {
        const pct = (d.spent / max) * 100;
        const budgetPct = d.budget != null ? (d.budget / max) * 100 : null;
        const tooltip = `${d.name}: ${formatCurrency(d.spent, currency)}${
          d.budget != null ? ` of ${formatCurrency(d.budget, currency)} budget (${Math.round((d.spent / d.budget) * 100)}%)` : ""
        }`;
        return (
          <li key={d.categoryId} className="grid gap-1" title={tooltip}>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="truncate">{d.name}</span>
                {d.status === "over" && (
                  <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                    <OctagonAlert className="size-3" /> Over
                  </span>
                )}
                {d.status === "near" && (
                  <span className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="size-3" /> Near
                  </span>
                )}
              </span>
              <span className="shrink-0 tabular-nums">
                {formatCurrency(d.spent, currency)}
                {d.budget != null && (
                  <span className="text-muted-foreground"> / {formatCurrency(d.budget, currency)}</span>
                )}
              </span>
            </div>
            <div className="relative h-2.5 rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full",
                  d.status === "over" ? "bg-red-500" : d.status === "near" ? "bg-amber-500" : "bg-(--series-1)",
                )}
                style={{ width: `${Math.max(pct, d.spent > 0 ? 1.5 : 0)}%` }}
              />
              {budgetPct != null && (
                <div
                  className="absolute -top-0.5 h-3.5 w-0.5 rounded bg-foreground/70 ring-2 ring-card"
                  style={{ left: `calc(${budgetPct}% - 1px)` }}
                  aria-hidden
                />
              )}
            </div>
          </li>
        );
      })}
      <li className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
        <span className="inline-block h-3 w-0.5 rounded bg-foreground/70" /> monthly budget
      </li>
    </ul>
  );
}
