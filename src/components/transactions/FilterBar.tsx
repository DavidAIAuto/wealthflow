"use client";

import { useMemo } from "react";
import { format, subMonths } from "date-fns";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/shared/SimpleSelect";
import type { Category } from "@/lib/types";

export type TxFilters = {
  q: string;
  month: string; // "all" | "yyyy-MM"
  type: "ALL" | "INCOME" | "EXPENSE";
  categoryId: string; // "" = any
};

export function FilterBar({
  filters,
  onChange,
  categories,
}: {
  filters: TxFilters;
  onChange: (f: TxFilters) => void;
  categories: Category[];
}) {
  const monthOptions = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 24 }, (_, i) => {
      const d = subMonths(now, i);
      return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") };
    });
    return [{ value: "all", label: "All time" }, ...months];
  }, []);

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "All categories" },
      ...categories
        .filter((c) => filters.type === "ALL" || c.type === filters.type)
        .map((c) => ({ value: String(c.id), label: c.name, color: c.color })),
    ],
    [categories, filters.type],
  );

  const set = (patch: Partial<TxFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_180px_150px_200px]">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search descriptions…"
          value={filters.q}
          onChange={(e) => set({ q: e.target.value })}
          aria-label="Search descriptions"
        />
      </div>
      <SimpleSelect aria-label="Month" value={filters.month} onChange={(v) => set({ month: v || "all" })} options={monthOptions} />
      <SimpleSelect
        aria-label="Type"
        value={filters.type}
        onChange={(v) => {
          const type = (v || "ALL") as TxFilters["type"];
          const cat = categories.find((c) => String(c.id) === filters.categoryId);
          set({ type, categoryId: cat && type !== "ALL" && cat.type !== type ? "" : filters.categoryId });
        }}
        options={[
          { value: "ALL", label: "All types" },
          { value: "INCOME", label: "Income" },
          { value: "EXPENSE", label: "Expense" },
        ]}
      />
      <SimpleSelect
        aria-label="Category"
        value={filters.categoryId || ""}
        onChange={(v) => set({ categoryId: v })}
        options={categoryOptions}
        placeholder="All categories"
      />
    </div>
  );
}
