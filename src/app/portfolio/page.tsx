"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorNote, PageHeader, StatCard } from "@/components/shared/bits";
import { AllocationChart } from "@/components/portfolio/AllocationChart";
import { HoldingModal } from "@/components/portfolio/HoldingModal";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { api, useApi } from "@/lib/client";
import { formatCurrency, formatPercent, signClass } from "@/lib/format";
import type { Holding, PortfolioResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function PortfolioPage() {
  const { data, setData, error, loading } = useApi<PortfolioResponse>("/api/portfolio");
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Holding | null>(null);

  async function refresh() {
    setRefreshing(true);
    try {
      const res = await api<PortfolioResponse>("/api/portfolio/refresh", { method: "POST" });
      setData(res);
      if (res.warning) toast.warning(res.warning);
      else toast.success("Prices refreshed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }

  const s = data?.summary;
  const cur = "USD";
  const mixedCurrency = data?.holdings.some((h) => h.currency !== "USD");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Stock Portfolio" description="Daily closing prices from Yahoo Finance, cached for 12 hours.">
        {data?.lastUpdated && (
          <Badge variant="outline" className="font-normal">
            Updated {formatDistanceToNow(new Date(data.lastUpdated), { addSuffix: true })}
          </Badge>
        )}
        <Button variant="outline" onClick={refresh} disabled={refreshing || !data?.holdings.length}>
          <RefreshCw className={cn(refreshing && "animate-spin")} />
          {refreshing ? "Refreshing…" : "Refresh Prices"}
        </Button>
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus />
          Add Stock
        </Button>
      </PageHeader>

      {data?.stale && data.holdings.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{data.warning ?? "Some prices are older than 12 hours; showing last cached close."}</span>
        </div>
      )}
      <ErrorNote message={error} />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total value"
          value={s ? formatCurrency(s.totalValue, cur) : "—"}
          sub={
            data?.convertedTotal != null
              ? `≈ ${formatCurrency(data.convertedTotal, data.settings.baseCurrency)} at ${data.settings.usdToBaseFx} ${data.settings.baseCurrency}/USD`
              : mixedCurrency
                ? "Includes non-USD holdings at native prices"
                : undefined
          }
        />
        <StatCard
          label="Day's gain / loss"
          value={s ? formatCurrency(s.dayChangeAmount, cur, { signed: true }) : "—"}
          valueClassName={signClass(s?.dayChangeAmount)}
          sub={s && formatPercent(s.dayChangePercent, { signed: true })}
        />
        <StatCard
          label="Unrealized gain / loss"
          value={s && s.costBasisCount > 0 ? formatCurrency(s.totalGainAmount, cur, { signed: true }) : "—"}
          valueClassName={signClass(s?.costBasisCount ? s.totalGainAmount : 0)}
          sub={
            s && s.costBasisCount > 0
              ? `${formatPercent(s.totalGainPercent, { signed: true })} on ${s.costBasisCount} holding${s.costBasisCount === 1 ? "" : "s"} with cost basis`
              : "Add a cost basis to track gains"
          }
        />
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && !data ? (
              <div className="grid gap-2">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <HoldingsTable
                holdings={data?.holdings ?? []}
                onEdit={(h) => {
                  setEditing(h);
                  setModalOpen(true);
                }}
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <AllocationChart holdings={data?.holdings ?? []} currency={cur} />
          </CardContent>
        </Card>
      </div>

      <HoldingModal open={modalOpen} onOpenChange={setModalOpen} holding={editing} />
    </div>
  );
}
