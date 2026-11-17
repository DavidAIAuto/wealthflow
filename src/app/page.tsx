"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorNote, MonthStepper, PageHeader } from "@/components/shared/bits";
import { CategorySpendChart } from "@/components/dashboard/CategorySpendChart";
import { FixedVsVariableChart } from "@/components/dashboard/FixedVsVariableChart";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { StatusBadge, logPayment } from "@/components/subscriptions/SubscriptionList";
import { TransactionTable, formatTxDate } from "@/components/transactions/TransactionTable";
import { useApp } from "@/components/layout/QuickAddTrigger";
import { useApi } from "@/lib/client";
import {
  currentMonthKey,
  fixedVsVariable,
  isDueWithin,
  spendByCategory,
  summarizeTransactions,
  totalMonthlyBurn,
} from "@/lib/finance";
import { formatCurrency } from "@/lib/format";
import type { Category, PortfolioResponse, RecurringItem, TransactionsResponse } from "@/lib/types";

export default function DashboardPage() {
  const { settings } = useApp();
  const cur = settings.baseCurrency;
  const [month, setMonth] = useState(() => currentMonthKey());

  const monthTx = useApi<TransactionsResponse>(`/api/transactions?month=${month}`);
  const recent = useApi<TransactionsResponse>("/api/transactions?month=all&limit=8");
  const subs = useApi<RecurringItem[]>("/api/subscriptions");
  const categories = useApi<Category[]>("/api/categories");
  const portfolio = useApi<PortfolioResponse>("/api/portfolio");
  const [logging, setLogging] = useState<number | null>(null);

  const txs = useMemo(() => monthTx.data?.transactions ?? [], [monthTx.data]);
  const totals = useMemo(() => summarizeTransactions(txs), [txs]);
  const spend = useMemo(() => spendByCategory(txs, categories.data ?? []), [txs, categories.data]);
  const split = useMemo(() => fixedVsVariable(txs), [txs]);
  const upcoming = useMemo(
    () => (subs.data ?? []).filter((i) => i.isActive && isDueWithin(new Date(i.nextDueDate), 7)),
    [subs.data],
  );
  const burn = useMemo(() => totalMonthlyBurn(subs.data ?? []), [subs.data]);

  const error = monthTx.error || subs.error || categories.error;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard">
        <MonthStepper value={month} onChange={setMonth} />
      </PageHeader>

      <ErrorNote message={error} />

      <KpiCards
        currency={cur}
        income={totals.income}
        expenses={totals.expenses}
        monthlyBurn={burn}
        dueSoon={upcoming.length}
        portfolio={portfolio.data}
      />

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Spending by category</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" render={<Link href="/settings" />} nativeButton={false}>
                Budgets
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <CategorySpendChart data={spend} currency={cur} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Fixed vs variable</CardTitle>
          </CardHeader>
          <CardContent>
            <FixedVsVariableChart fixed={split.fixed} variable={split.variable} currency={cur} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming bills · next 7 days</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" render={<Link href="/subscriptions" />} nativeButton={false}>
                All <ArrowRight />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <EmptyState>Nothing due this week.</EmptyState>
            ) : (
              <ul className="divide-y">
                {upcoming.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{item.name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {formatTxDate(item.nextDueDate, "EEE, MMM d")}
                        <StatusBadge item={item} />
                      </div>
                    </div>
                    <span className="text-sm tabular-nums">{formatCurrency(item.amount, cur)}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={logging === item.id}
                      onClick={async () => {
                        setLogging(item.id);
                        await logPayment(item, cur);
                        setLogging(null);
                      }}
                    >
                      <Receipt />
                      Log
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent transactions</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" render={<Link href="/transactions" />} nativeButton={false}>
                View all <ArrowRight />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <TransactionTable transactions={recent.data?.transactions ?? []} showActions={false} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
