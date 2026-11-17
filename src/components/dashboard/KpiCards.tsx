"use client";

import { ArrowDownRight, ArrowUpRight, CalendarClock, LineChart, Scale } from "lucide-react";
import { StatCard } from "@/components/shared/bits";
import { formatCurrency, formatPercent, signClass } from "@/lib/format";
import type { PortfolioResponse } from "@/lib/types";

export function KpiCards({
  currency,
  income,
  expenses,
  monthlyBurn,
  dueSoon,
  portfolio,
}: {
  currency: string;
  income: number;
  expenses: number;
  monthlyBurn: number;
  dueSoon: number;
  portfolio: PortfolioResponse | null;
}) {
  const net = income - expenses;
  const ps = portfolio?.summary;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Net cash flow"
        icon={<Scale className="size-4" />}
        value={formatCurrency(net, currency, { signed: true })}
        valueClassName={net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}
        sub={net >= 0 ? "Surplus this month" : "Deficit this month"}
      />
      <StatCard
        label="Income vs expenses"
        value={
          <div className="grid gap-0.5 text-base">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="size-4" />
              {formatCurrency(income, currency)}
            </span>
            <span className="flex items-center gap-1">
              <ArrowDownRight className="size-4 text-muted-foreground" />
              {formatCurrency(expenses, currency)}
            </span>
          </div>
        }
        sub={income > 0 ? `${formatPercent((expenses / income) * 100, { digits: 0 })} of income spent` : undefined}
      />
      <StatCard
        label="Fixed monthly burn"
        icon={<CalendarClock className="size-4" />}
        value={formatCurrency(monthlyBurn, currency)}
        sub={
          dueSoon > 0 ? (
            <span className="text-amber-700 dark:text-amber-400">
              {dueSoon} bill{dueSoon === 1 ? "" : "s"} due within 7 days
            </span>
          ) : (
            "Nothing due in the next 7 days"
          )
        }
      />
      <StatCard
        label="Stock portfolio"
        icon={<LineChart className="size-4" />}
        value={ps ? formatCurrency(ps.totalValue, "USD") : "—"}
        sub={
          ps && ps.totalValue > 0 ? (
            <span className={signClass(ps.dayChangeAmount)}>
              {formatCurrency(ps.dayChangeAmount, "USD", { signed: true })} (
              {formatPercent(ps.dayChangePercent, { signed: true })}) today
              {portfolio?.convertedTotal != null && (
                <span className="text-muted-foreground">
                  {" "}
                  · ≈ {formatCurrency(portfolio.convertedTotal, portfolio.settings.baseCurrency, { compact: true })}
                </span>
              )}
            </span>
          ) : (
            "No holdings yet"
          )
        }
      />
    </div>
  );
}
