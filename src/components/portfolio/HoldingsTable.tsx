"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/bits";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { api, notifyDataChanged } from "@/lib/client";
import { formatCurrency, formatPercent, formatShares, signClass } from "@/lib/format";
import type { Holding } from "@/lib/types";

function Change({ amount, percent, currency }: { amount: number | null; percent: number | null; currency: string }) {
  if (amount == null) return <span className="text-muted-foreground">—</span>;
  return (
    <div className={`tabular-nums ${signClass(amount)}`}>
      <div>{formatCurrency(amount, currency, { signed: true })}</div>
      {percent != null && <div className="text-xs">{formatPercent(percent, { signed: true })}</div>}
    </div>
  );
}

export function HoldingsTable({ holdings, onEdit }: { holdings: Holding[]; onEdit: (h: Holding) => void }) {
  const [toDelete, setToDelete] = useState<Holding | null>(null);
  if (holdings.length === 0) return <EmptyState>No holdings yet. Add a ticker to start tracking.</EmptyState>;

  const actions = (h: Holding) => (
    <div className="flex justify-end">
      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${h.ticker}`} onClick={() => onEdit(h)}>
        <Pencil />
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label={`Delete ${h.ticker}`} onClick={() => setToDelete(h)}>
        <Trash2 />
      </Button>
    </div>
  );

  return (
    <>
      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Holding</TableHead>
              <TableHead className="text-right">Shares</TableHead>
              <TableHead className="text-right">Last close</TableHead>
              <TableHead className="text-right">Market value</TableHead>
              <TableHead className="text-right">Allocation</TableHead>
              <TableHead className="text-right">Day change</TableHead>
              <TableHead className="text-right">Unrealized</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map((h) => (
              <TableRow key={h.id}>
                <TableCell>
                  <div className="font-semibold">{h.ticker}</div>
                  <div className="max-w-48 truncate text-xs text-muted-foreground">{h.companyName ?? "—"}</div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatShares(h.shares)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {h.closingPrice != null ? formatCurrency(h.closingPrice, h.currency) : "—"}
                  {h.avgCostBasis != null && (
                    <div className="text-xs text-muted-foreground">cost {formatCurrency(h.avgCostBasis, h.currency)}</div>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {h.closingPrice != null ? formatCurrency(h.marketValue, h.currency) : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatPercent(h.allocationPercent, { digits: 1 })}</TableCell>
                <TableCell className="text-right">
                  <Change
                    amount={h.closingPrice != null ? h.dayChangeAmount : null}
                    percent={h.dayChangePercent}
                    currency={h.currency}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Change amount={h.totalGainAmount} percent={h.totalGainPercent} currency={h.currency} />
                </TableCell>
                <TableCell>{actions(h)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="divide-y lg:hidden">
        {holdings.map((h) => (
          <li key={h.id} className="grid gap-2 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold">
                  {h.ticker}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    {formatShares(h.shares)} sh @ {h.closingPrice != null ? formatCurrency(h.closingPrice, h.currency) : "—"}
                  </span>
                </div>
                <div className="truncate text-xs text-muted-foreground">{h.companyName}</div>
              </div>
              <div className="text-right">
                <div className="font-medium tabular-nums">{formatCurrency(h.marketValue, h.currency)}</div>
                <div className="text-xs text-muted-foreground">{formatPercent(h.allocationPercent, { digits: 1 })}</div>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 text-xs">
              <div>
                <div className="text-muted-foreground">Day</div>
                <Change amount={h.closingPrice != null ? h.dayChangeAmount : null} percent={h.dayChangePercent} currency={h.currency} />
              </div>
              <div>
                <div className="text-muted-foreground">Unrealized</div>
                <Change amount={h.totalGainAmount} percent={h.totalGainPercent} currency={h.currency} />
              </div>
              {actions(h)}
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={toDelete != null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Remove ${toDelete?.ticker ?? "holding"}?`}
        description="The holding and its cached price will be removed."
        confirmLabel="Remove"
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await api(`/api/portfolio/${toDelete.id}`, { method: "DELETE" });
            toast.success(`${toDelete.ticker} removed`);
            notifyDataChanged();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Delete failed");
          }
        }}
      />
    </>
  );
}
