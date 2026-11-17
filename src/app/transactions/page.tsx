"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorNote, PageHeader, StatCard } from "@/components/shared/bits";
import { FilterBar, type TxFilters } from "@/components/transactions/FilterBar";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { QuickAddTrigger, useApp } from "@/components/layout/QuickAddTrigger";
import { useApi } from "@/lib/client";
import { currentMonthKey } from "@/lib/finance";
import { formatCurrency, signClass } from "@/lib/format";
import type { Category, TransactionsResponse } from "@/lib/types";

export default function TransactionsPage() {
  const { settings } = useApp();
  const [filters, setFilters] = useState<TxFilters>(() => ({
    q: "",
    month: currentMonthKey(),
    type: "ALL",
    categoryId: "",
  }));
  const q = useDeferredValue(filters.q.trim());

  const url = useMemo(() => {
    const p = new URLSearchParams({ month: filters.month });
    if (filters.type !== "ALL") p.set("type", filters.type);
    if (filters.categoryId) p.set("categoryId", filters.categoryId);
    if (q) p.set("q", q);
    return `/api/transactions?${p}`;
  }, [filters.month, filters.type, filters.categoryId, q]);

  const { data, error, loading } = useApi<TransactionsResponse>(url);
  const { data: categories } = useApi<Category[]>("/api/categories");
  const cur = settings.baseCurrency;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Transactions" description="Your income & expense ledger.">
        <QuickAddTrigger compact className="hidden md:inline-flex" />
      </PageHeader>

      <FilterBar filters={filters} onChange={setFilters} categories={categories ?? []} />

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <StatCard
          label="Income"
          value={formatCurrency(data?.summary.income ?? 0, cur)}
          valueClassName="text-sm sm:text-2xl text-emerald-600 dark:text-emerald-400"
        />
        <StatCard label="Expenses" value={formatCurrency(data?.summary.expenses ?? 0, cur)} valueClassName="text-sm sm:text-2xl" />
        <StatCard
          label="Net"
          value={formatCurrency(data?.summary.net ?? 0, cur, { signed: true })}
          valueClassName={`text-sm sm:text-2xl ${signClass(data?.summary.net)}`}
        />
      </div>

      <ErrorNote message={error} />

      <Card>
        <CardContent>
          {loading && !data ? (
            <div className="grid gap-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <TransactionTable transactions={data?.transactions ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
