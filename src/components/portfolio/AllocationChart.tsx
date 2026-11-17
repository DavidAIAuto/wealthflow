"use client";

import { DonutChart, SERIES, SERIES_OTHER, type DonutSlice } from "@/components/shared/DonutChart";
import { formatCurrency } from "@/lib/format";
import type { Holding } from "@/lib/types";

/**
 * Allocation by ticker. Colors follow the ticker (alphabetical slot), not its rank;
 * beyond 8 holdings the smallest fold into "Other".
 */
export function AllocationChart({ holdings, currency = "USD" }: { holdings: Holding[]; currency?: string }) {
  const priced = holdings.filter((h) => h.marketValue > 0);
  const byTicker = [...priced].sort((a, b) => a.ticker.localeCompare(b.ticker));
  const colorOf = new Map(byTicker.map((h, i) => [h.ticker, SERIES[i % SERIES.length]]));

  const sorted = [...priced].sort((a, b) => b.marketValue - a.marketValue);
  const needsOther = sorted.length > 8;
  const top = needsOther ? sorted.slice(0, 7) : sorted;
  const rest = needsOther ? sorted.slice(7) : [];

  const slices: DonutSlice[] = top.map((h) => ({
    key: h.ticker,
    label: h.ticker,
    sub: h.companyName ?? undefined,
    value: h.marketValue,
    color: needsOther ? SERIES[top.indexOf(h)] : colorOf.get(h.ticker)!,
  }));
  if (rest.length) {
    slices.push({
      key: "__other",
      label: `Other (${rest.length})`,
      value: rest.reduce((s, h) => s + h.marketValue, 0),
      color: SERIES_OTHER,
    });
  }

  return (
    <DonutChart
      slices={slices}
      formatValue={(v) => formatCurrency(v, currency)}
      centerLabel="holdings"
      centerValue={String(priced.length)}
      empty="Add a stock to see your allocation."
    />
  );
}
