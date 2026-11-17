"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CategoryBadge, EmptyState } from "@/components/shared/bits";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useApp } from "@/components/layout/QuickAddTrigger";
import { api, notifyDataChanged } from "@/lib/client";
import { formatCurrency } from "@/lib/format";
import type { Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Display a stored (UTC-noon) date without timezone drift. */
export function formatTxDate(iso: string, pattern = "MMM d, yyyy") {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return format(new Date(y, m - 1, d), pattern);
}

export function AmountText({ tx, currency }: { tx: Pick<Transaction, "type" | "amount">; currency: string }) {
  const income = tx.type === "INCOME";
  return (
    <span className={cn("font-medium tabular-nums", income ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>
      {income ? "+" : "-"}
      {formatCurrency(tx.amount, currency)}
    </span>
  );
}

export function TransactionTable({
  transactions,
  showActions = true,
}: {
  transactions: Transaction[];
  showActions?: boolean;
}) {
  const { openTransaction, settings } = useApp();
  const [toDelete, setToDelete] = useState<Transaction | null>(null);

  if (transactions.length === 0) return <EmptyState>No transactions found.</EmptyState>;

  return (
    <>
      {/* Desktop / tablet table */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="w-24">Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              {showActions && <TableHead className="w-24 text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="text-muted-foreground">{formatTxDate(tx.date)}</TableCell>
                <TableCell className="max-w-64 truncate">{tx.description || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>
                  <CategoryBadge name={tx.category.name} color={tx.category.color} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{tx.type === "INCOME" ? "Income" : "Expense"}</TableCell>
                <TableCell className="text-right">
                  <AmountText tx={tx} currency={settings.baseCurrency} />
                </TableCell>
                {showActions && (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={() => openTransaction(tx)}>
                      <Pencil />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Delete" onClick={() => setToDelete(tx)}>
                      <Trash2 />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile list */}
      <ul className="divide-y sm:hidden">
        {transactions.map((tx) => (
          <li key={tx.id} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{tx.description || tx.category.name}</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                {formatTxDate(tx.date, "MMM d")}
                <CategoryBadge name={tx.category.name} color={tx.category.color} />
              </div>
            </div>
            <AmountText tx={tx} currency={settings.baseCurrency} />
            {showActions && (
              <div className="flex">
                <Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={() => openTransaction(tx)}>
                  <Pencil />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Delete" onClick={() => setToDelete(tx)}>
                  <Trash2 />
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={toDelete != null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete transaction?"
        description={
          toDelete &&
          `${toDelete.description || toDelete.category.name} · ${formatCurrency(toDelete.amount, settings.baseCurrency)} on ${formatTxDate(toDelete.date)}. This can't be undone.`
        }
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await api(`/api/transactions/${toDelete.id}`, { method: "DELETE" });
            toast.success("Transaction deleted");
            notifyDataChanged();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Delete failed");
          }
        }}
      />
    </>
  );
}
