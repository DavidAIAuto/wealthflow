"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Plus, Repeat, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorNote, PageHeader, StatCard } from "@/components/shared/bits";
import { SubscriptionList } from "@/components/subscriptions/SubscriptionList";
import { SubscriptionModal } from "@/components/subscriptions/SubscriptionModal";
import { useApp } from "@/components/layout/QuickAddTrigger";
import { useApi } from "@/lib/client";
import { isDueWithin, totalMonthlyBurn } from "@/lib/finance";
import { formatCurrency } from "@/lib/format";
import type { RecurringItem } from "@/lib/types";

export default function SubscriptionsPage() {
  const { settings } = useApp();
  const cur = settings.baseCurrency;
  const { data, error, loading } = useApi<RecurringItem[]>("/api/subscriptions");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringItem | null>(null);

  const stats = useMemo(() => {
    const items = data ?? [];
    const active = items.filter((i) => i.isActive);
    const monthly = totalMonthlyBurn(items);
    return {
      monthly,
      annual: monthly * 12,
      activeCount: active.length,
      dueSoon: active.filter((i) => isDueWithin(new Date(i.nextDueDate), 7)).length,
    };
  }, [data]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Subscriptions & Bills" description="Recurring costs, normalized to a monthly burn.">
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus />
          Add Bill
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Monthly committed" value={formatCurrency(stats.monthly, cur)} icon={<Wallet className="size-4" />} />
        <StatCard label="Annualized" value={formatCurrency(stats.annual, cur)} icon={<TrendingUp className="size-4" />} />
        <StatCard label="Active" value={stats.activeCount} icon={<Repeat className="size-4" />} />
        <StatCard
          label="Due in 7 days"
          value={stats.dueSoon}
          sub="Includes overdue"
          icon={<CalendarClock className="size-4" />}
          valueClassName={stats.dueSoon > 0 ? "text-amber-600 dark:text-amber-400" : undefined}
        />
      </div>

      <ErrorNote message={error} />

      <Card>
        <CardContent>
          {loading && !data ? (
            <div className="grid gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <SubscriptionList
              items={data ?? []}
              onEdit={(item) => {
                setEditing(item);
                setModalOpen(true);
              }}
            />
          )}
        </CardContent>
      </Card>

      <SubscriptionModal open={modalOpen} onOpenChange={setModalOpen} item={editing} />
    </div>
  );
}
