"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleSelect } from "@/components/shared/SimpleSelect";
import { ErrorNote } from "@/components/shared/bits";
import { api, notifyDataChanged, useApi } from "@/lib/client";
import { localDateKey } from "@/lib/finance";
import type { Category, Transaction } from "@/lib/types";
import { TransactionInput } from "@/lib/validators";
import { cn } from "@/lib/utils";

type TxType = "INCOME" | "EXPENSE";

export function TransactionModal({
  open,
  onOpenChange,
  transaction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this transaction. */
  transaction?: Transaction | null;
}) {
  // The form only mounts while open, so its state starts fresh on every open.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <TransactionForm key={transaction?.id ?? "new"} transaction={transaction} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function TransactionForm({ transaction, onClose }: { transaction?: Transaction | null; onClose: () => void }) {
  const { data: categories } = useApi<Category[]>("/api/categories");
  const [type, setType] = useState<TxType>(transaction?.type ?? "EXPENSE");
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [categoryId, setCategoryId] = useState(transaction ? String(transaction.categoryId) : "");
  const [date, setDate] = useState(() => (transaction ? transaction.date.slice(0, 10) : localDateKey()));
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const options = useMemo(
    () =>
      (categories ?? [])
        .filter((c) => c.type === type)
        .map((c) => ({ value: String(c.id), label: c.name, color: c.color })),
    [categories, type],
  );

  function switchType(next: TxType) {
    setType(next);
    // Keep the category only if it belongs to the new type.
    if (!categories?.some((c) => String(c.id) === categoryId && c.type === next)) setCategoryId("");
  }

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = TransactionInput.safeParse({
      type,
      amount: amount.trim() === "" ? undefined : Number(amount),
      categoryId: categoryId ? Number(categoryId) : 0,
      date,
      description,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (transaction) {
        await api(`/api/transactions/${transaction.id}`, { method: "PATCH", json: parsed.data });
        toast.success("Transaction updated");
      } else {
        await api("/api/transactions", { method: "POST", json: parsed.data });
        toast.success(type === "INCOME" ? "Income added" : "Expense added");
      }
      notifyDataChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
        <DialogHeader>
          <DialogTitle>{transaction ? "Edit transaction" : "Add transaction"}</DialogTitle>
          <DialogDescription>Record income or an expense.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label="Type">
            {(["EXPENSE", "INCOME"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={type === t}
                onClick={() => switchType(t)}
                className={cn(
                  "rounded-md py-1.5 text-sm font-medium transition-colors",
                  type === t
                    ? t === "INCOME"
                      ? "bg-background text-emerald-600 shadow-sm dark:text-emerald-400"
                      : "bg-background text-red-600 shadow-sm dark:text-red-400"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t === "INCOME" ? "Income" : "Expense"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="tx-amount">Amount</Label>
              <Input
                id="tx-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tx-date">Date</Label>
              <Input id="tx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tx-category">Category</Label>
            <SimpleSelect
              id="tx-category"
              value={categoryId}
              onChange={setCategoryId}
              options={options}
              placeholder={categories ? "Choose a category" : "Loading…"}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tx-desc">Description</Label>
            <Input
              id="tx-desc"
              maxLength={200}
              placeholder="Optional"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <ErrorNote message={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : transaction ? "Save changes" : "Add"}
            </Button>
          </DialogFooter>
        </form>
    </>
  );
}
