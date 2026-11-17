"use client";

import { Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { EmptyState } from "./bits";

export const SERIES = Array.from({ length: 8 }, (_, i) => `var(--series-${i + 1})`);
export const SERIES_OTHER = "var(--series-other)";

export type DonutSlice = { key: string; label: string; value: number; color: string; sub?: string };

/**
 * Donut + labelled legend (legend carries identity and values, so color is never
 * the only cue). Slices are separated by a 2px surface gap.
 */
export function DonutChart({
  slices,
  formatValue,
  centerLabel,
  centerValue,
  empty = "No data yet.",
}: {
  slices: DonutSlice[];
  formatValue: (v: number) => string;
  centerLabel?: string;
  centerValue?: string;
  empty?: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total <= 0) return <EmptyState>{empty}</EmptyState>;

  return (
    <div className="@container">
    <div className="flex flex-col items-center gap-4 @md:flex-row">
      <div className="relative size-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices.map((s) => ({ ...s, fill: s.color }))}
              dataKey="value"
              nameKey="label"
              innerRadius="64%"
              outerRadius="100%"
              stroke="var(--card)"
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
            />
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                const p = active && payload?.[0]?.payload as DonutSlice | undefined;
                if (!p) return null;
                return (
                  <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md">
                    <div className="font-medium">{p.label}</div>
                    <div className="tabular-nums text-muted-foreground">
                      {formatValue(p.value)} · {((p.value / total) * 100).toFixed(1)}%
                    </div>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {(centerLabel || centerValue) && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerValue && <div className="text-sm font-semibold tabular-nums">{centerValue}</div>}
            {centerLabel && <div className="text-xs text-muted-foreground">{centerLabel}</div>}
          </div>
        )}
      </div>
      <ul className="grid w-full min-w-0 flex-1 gap-2 text-sm">
        {slices.map((s) => (
          <li key={s.key} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="min-w-0 truncate font-medium">{s.label}</span>
            <span className="text-right tabular-nums">{formatValue(s.value)}</span>
            <span className="col-start-2 min-w-0 truncate text-xs text-muted-foreground">{s.sub}</span>
            <span className="text-right text-xs tabular-nums text-muted-foreground">
              {((s.value / total) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
    </div>
  );
}
