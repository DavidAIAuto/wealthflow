"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionModal } from "@/components/transactions/TransactionModal";
import { useApi } from "@/lib/client";
import type { Settings, Transaction } from "@/lib/types";

type AppCtx = {
  /** Open the shared transaction dialog (pass a transaction to edit it). */
  openTransaction: (tx?: Transaction | null) => void;
  settings: { baseCurrency: string; usdToBaseFx: number };
};

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const { data } = useApi<Settings>("/api/settings");

  const openTransaction = useCallback((tx?: Transaction | null) => {
    setEditing(tx ?? null);
    setOpen(true);
  }, []);

  const value = useMemo<AppCtx>(
    () => ({
      openTransaction,
      settings: { baseCurrency: data?.baseCurrency ?? "USD", usdToBaseFx: data?.usdToBaseFx ?? 1 },
    }),
    [openTransaction, data],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <TransactionModal open={open} onOpenChange={setOpen} transaction={editing} />
    </Ctx.Provider>
  );
}

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

export function QuickAddTrigger({
  compact,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { openTransaction } = useApp();
  return (
    <Button className={className} size={compact ? "sm" : "lg"} onClick={() => openTransaction()}>
      <Plus />
      {compact ? "Add" : "Add Transaction"}
    </Button>
  );
}
