"use client";

import { DonutChart, SERIES } from "@/components/shared/DonutChart";
import { formatCurrency } from "@/lib/format";

export function FixedVsVariableChart({
  fixed,
  variable,
  currency,
}: {
  fixed: number;
  variable: number;
  currency: string;
}) {
  return (
    <DonutChart
      slices={[
        { key: "fixed", label: "Fixed", sub: "rent, bills, subscriptions", value: fixed, color: SERIES[0] },
        { key: "variable", label: "Variable", sub: "food, transport, fun…", value: variable, color: SERIES[1] },
      ]}
      formatValue={(v) => formatCurrency(v, currency)}
      centerValue={formatCurrency(fixed + variable, currency, { compact: true })}
      centerLabel="spent"
      empty="No expenses this month."
    />
  );
}
