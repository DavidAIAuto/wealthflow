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
import { Switch } from "@/components/ui/switch";
import { SimpleSelect } from "@/components/shared/SimpleSelect";
import { ErrorNote } from "@/components/shared/bits";
import { api, notifyDataChanged, useApi } from "@/lib/client";
import { CYCLES, localDateKey } from "@/lib/finance";
import type { Category, RecurringItem } from "@/lib/types";
import { RecurringItemInput } from "@/lib/validators";

export const CYCLE_LABELS: Record<RecurringItem["cycle"], string> = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

export function SubscriptionModal({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: RecurringItem | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <SubscriptionForm key={item?.id ?? "new"} item={item} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function SubscriptionForm({ item, onClose }: { item?: RecurringItem | null; onClose: () => void }) {
  const { data: categories } = useApi<Category[]>("/api/categories");
  const [name, setName] = useState(item?.name ?? "");
  const [amount, setAmount] = useState(item ? String(item.amount) : "");
  const [cycle, setCycle] = useState<string>(item?.cycle ?? "MONTHLY");
  const [nextDueDate, setNextDueDate] = useState(() => (item ? item.nextDueDate.slice(0, 10) : localDateKey()));
  const [pickedCategoryId, setCategoryId] = useState(item ? String(item.categoryId) : "");
  const [isActive, setIsActive] = useState(item?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // New items default to the "Subscriptions" category until the user picks one.
  const defaultCategory = categories?.find((c) => c.name === "Subscriptions" && c.type === "EXPENSE");
  const categoryId = pickedCategoryId || (defaultCategory ? String(defaultCategory.id) : "");

  const options = useMemo(
    () =>
      (categories ?? [])
        .filter((c) => c.type === "EXPENSE")
        .map((c) => ({ value: String(c.id), label: c.name, color: c.color })),
    [categories],
  );

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = RecurringItemInput.safeParse({
      name,
      amount: amount.trim() === "" ? undefined : Number(amount),
      cycle,
      nextDueDate,
      categoryId: categoryId ? Number(categoryId) : 0,
      isActive,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (item) await api(`/api/subscriptions/${item.id}`, { method: "PATCH", json: parsed.data });
      else await api("/api/subscriptions", { method: "POST", json: parsed.data });
      toast.success(item ? "Bill updated" : "Bill added");
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
          <DialogTitle>{item ? "Edit recurring bill" : "Add recurring bill"}</DialogTitle>
          <DialogDescription>Subscriptions, rent, utilities and other fixed costs.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="sub-name">Name</Label>
            <Input id="sub-name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Netflix" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="sub-amount">Amount</Label>
              <Input
                id="sub-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sub-cycle">Billing cycle</Label>
              <SimpleSelect
                id="sub-cycle"
                value={cycle}
                onChange={(v) => setCycle(v || "MONTHLY")}
                options={CYCLES.map((c) => ({ value: c, label: CYCLE_LABELS[c] }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="sub-due">Next due date</Label>
              <Input id="sub-due" type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sub-cat">Category</Label>
              <SimpleSelect id="sub-cat" value={categoryId} onChange={setCategoryId} options={options} placeholder="Choose…" />
            </div>
          </div>
          <label className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
            Active
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </label>
          <ErrorNote message={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : item ? "Save changes" : "Add bill"}
            </Button>
          </DialogFooter>
        </form>
    </>
  );
}
