"use client";

import { useState } from "react";
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
import { ErrorNote } from "@/components/shared/bits";
import { api, notifyDataChanged } from "@/lib/client";
import type { Holding } from "@/lib/types";
import { StockHoldingInput } from "@/lib/validators";

export function HoldingModal({
  open,
  onOpenChange,
  holding,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holding?: Holding | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <HoldingForm key={holding?.id ?? "new"} holding={holding} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function HoldingForm({ holding, onClose }: { holding?: Holding | null; onClose: () => void }) {
  const [ticker, setTicker] = useState(holding?.ticker ?? "");
  const [shares, setShares] = useState(holding ? String(holding.shares) : "");
  const [cost, setCost] = useState(holding?.avgCostBasis != null ? String(holding.avgCostBasis) : "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = StockHoldingInput.safeParse({
      ticker: holding?.ticker ?? ticker,
      shares: shares.trim() === "" ? undefined : Number(shares),
      avgCostBasis: cost.trim() === "" ? null : Number(cost),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (holding) {
        await api(`/api/portfolio/${holding.id}`, {
          method: "PATCH",
          json: { shares: parsed.data.shares, avgCostBasis: parsed.data.avgCostBasis },
        });
        toast.success(`${holding.ticker} updated`);
      } else {
        await api("/api/portfolio", { method: "POST", json: parsed.data });
        toast.success(`${parsed.data.ticker} added`);
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
          <DialogTitle>{holding ? `Edit ${holding.ticker}` : "Add stock"}</DialogTitle>
          <DialogDescription>
            {holding
              ? "Update your share count or average cost."
              : "The ticker is checked against Yahoo Finance. Adding an existing ticker replaces its shares."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          {!holding && (
            <div className="grid gap-1.5">
              <Label htmlFor="h-ticker">Ticker</Label>
              <Input
                id="h-ticker"
                placeholder="e.g. AAPL, VOO"
                value={ticker}
                maxLength={15}
                autoCapitalize="characters"
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                autoFocus
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="h-shares">Shares</Label>
              <Input
                id="h-shares"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                placeholder="0.000000"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                autoFocus={!!holding}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="h-cost">Avg cost / share</Label>
              <Input
                id="h-cost"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                placeholder="Optional"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>
          </div>
          <ErrorNote message={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (holding ? "Saving…" : "Checking ticker…") : holding ? "Save changes" : "Add stock"}
            </Button>
          </DialogFooter>
        </form>
    </>
  );
}
