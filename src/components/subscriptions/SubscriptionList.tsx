"use client";

import { useState } from "react";
import { MoreHorizontal, Pause, Pencil, Play, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CategoryBadge, EmptyState } from "@/components/shared/bits";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { formatTxDate } from "@/components/transactions/TransactionTable";
import { useApp } from "@/components/layout/QuickAddTrigger";
import { api, notifyDataChanged } from "@/lib/client";
import { recurringStatus, type RecurringStatus } from "@/lib/finance";
import { formatCurrency } from "@/lib/format";
import type { RecurringItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CYCLE_LABELS } from "./SubscriptionModal";

const STATUS_STYLES: Record<RecurringStatus, { label: string; className: string }> = {
  OVERDUE: { label: "Overdue", className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
  DUE_SOON: { label: "Due Soon", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  ACTIVE: { label: "Active", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  PAUSED: { label: "Paused", className: "bg-muted text-muted-foreground" },
};

export function StatusBadge({ item }: { item: Pick<RecurringItem, "isActive" | "nextDueDate"> }) {
  const s = STATUS_STYLES[recurringStatus({ isActive: item.isActive, nextDueDate: new Date(item.nextDueDate) })];
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", s.className)}>{s.label}</span>;
}

/** Log one payment for a recurring item (creates an expense, advances the due date). */
export async function logPayment(item: RecurringItem, currency: string) {
  try {
    const res = await api<{ recurringItem: RecurringItem }>(`/api/subscriptions/${item.id}/log`, { method: "POST" });
    toast.success(`Logged ${formatCurrency(item.amount, currency)} for ${item.name}`, {
      description: `Next due ${formatTxDate(res.recurringItem.nextDueDate)}`,
    });
    notifyDataChanged();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Could not log payment");
  }
}

export function SubscriptionList({
  items,
  onEdit,
}: {
  items: RecurringItem[];
  onEdit: (item: RecurringItem) => void;
}) {
  const { settings } = useApp();
  const cur = settings.baseCurrency;
  const [toDelete, setToDelete] = useState<RecurringItem | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  if (items.length === 0) return <EmptyState>No recurring bills yet. Add rent, subscriptions or utilities.</EmptyState>;

  async function run(id: number, fn: () => Promise<void>) {
    setBusy(id);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  }

  async function toggle(item: RecurringItem) {
    try {
      await api(`/api/subscriptions/${item.id}`, { method: "PATCH", json: { isActive: !item.isActive } });
      toast.success(item.isActive ? `${item.name} paused` : `${item.name} resumed`);
      notifyDataChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  const actions = (item: RecurringItem) => (
    <div className="flex items-center justify-end gap-1">
      <Button
        size="sm"
        variant="outline"
        disabled={!item.isActive || busy === item.id}
        onClick={() => run(item.id, () => logPayment(item, cur))}
      >
        <Receipt />
        Log<span className="hidden lg:inline"> Payment</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="More actions" />}>
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => run(item.id, () => toggle(item))}>
            {item.isActive ? <Pause /> : <Play />}
            {item.isActive ? "Pause" : "Resume"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEdit(item)}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setToDelete(item)}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Cycle</TableHead>
              <TableHead>Next due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className={cn(!item.isActive && "opacity-60")}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>
                  <CategoryBadge name={item.category.name} color={item.category.color} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(item.amount, cur)}</TableCell>
                <TableCell className="text-muted-foreground">{CYCLE_LABELS[item.cycle]}</TableCell>
                <TableCell>{formatTxDate(item.nextDueDate)}</TableCell>
                <TableCell>
                  <StatusBadge item={item} />
                </TableCell>
                <TableCell>{actions(item)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="divide-y md:hidden">
        {items.map((item) => (
          <li key={item.id} className={cn("flex flex-col gap-2 py-3", !item.isActive && "opacity-60")}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-medium">{item.name}</div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(item.amount, cur)} · {CYCLE_LABELS[item.cycle]} · due {formatTxDate(item.nextDueDate, "MMM d")}
                </div>
              </div>
              <StatusBadge item={item} />
            </div>
            {actions(item)}
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={toDelete != null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete recurring bill?"
        description={toDelete && `"${toDelete.name}" will be removed. Past logged payments are kept.`}
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await api(`/api/subscriptions/${toDelete.id}`, { method: "DELETE" });
            toast.success("Bill deleted");
            notifyDataChanged();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Delete failed");
          }
        }}
      />
    </>
  );
}
