"use client";

import { useState } from "react";
import { Download, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { SimpleSelect } from "@/components/shared/SimpleSelect";
import { ErrorNote, PageHeader } from "@/components/shared/bits";
import { api, notifyDataChanged, useApi } from "@/lib/client";
import type { Category, Settings } from "@/lib/types";
import { CURRENCIES } from "@/lib/validators";

const CURRENCY_LABELS: Record<string, string> = {
  USD: "USD — US Dollar",
  NGN: "NGN — Nigerian Naira",
  EUR: "EUR — Euro",
  GBP: "GBP — British Pound",
  CAD: "CAD — Canadian Dollar",
};

function CurrencySettings() {
  const { data } = useApi<Settings>("/api/settings");
  if (!data) return null;
  // Re-key on saved values so the form resyncs after a save.
  return <CurrencyForm key={`${data.baseCurrency}|${data.usdToBaseFx}`} settings={data} />;
}

function CurrencyForm({ settings }: { settings: Settings }) {
  const [base, setBase] = useState(settings.baseCurrency);
  const [fx, setFx] = useState(String(settings.usdToBaseFx));
  const [saving, setSaving] = useState(false);

  async function save() {
    const rate = Number(fx);
    if (!Number.isFinite(rate) || rate <= 0) {
      toast.error("FX rate must be greater than 0");
      return;
    }
    setSaving(true);
    try {
      await api("/api/settings", { method: "PATCH", json: { baseCurrency: base, usdToBaseFx: rate } });
      toast.success("Currency settings saved");
      notifyDataChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Currency</CardTitle>
        <CardDescription>
          Income, expenses and budgets are shown in your base currency. Stocks keep their native (usually USD) prices;
          the portfolio total is also converted using the rate below when it isn&apos;t 1.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="grid gap-1.5">
          <Label htmlFor="base-cur">Base currency</Label>
          <SimpleSelect
            id="base-cur"
            value={base}
            onChange={(v) => setBase(v || "USD")}
            options={CURRENCIES.map((c) => ({ value: c, label: CURRENCY_LABELS[c] }))}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="fx">1 USD = ? {base}</Label>
          <Input id="fx" type="number" step="any" min="0" value={fx} onChange={(e) => setFx(e.target.value)} />
        </div>
        <Button onClick={save} disabled={saving}>
          <Save />
          {saving ? "Saving…" : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}

function CategoryRow({ category, onDelete }: { category: Category; onDelete: (c: Category) => void }) {
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color);
  const [budget, setBudget] = useState(category.monthlyBudget != null ? String(category.monthlyBudget) : "");
  const [saving, setSaving] = useState(false);

  const isExpense = category.type === "EXPENSE";
  const dirty =
    name.trim() !== category.name ||
    color !== category.color ||
    (isExpense && (budget.trim() === "" ? null : Number(budget)) !== category.monthlyBudget);

  async function save() {
    const budgetVal = budget.trim() === "" ? null : Number(budget);
    if (budgetVal != null && (!Number.isFinite(budgetVal) || budgetVal <= 0)) {
      toast.error("Budget must be greater than 0 (leave empty for none)");
      return;
    }
    setSaving(true);
    try {
      await api(`/api/categories/${category.id}`, {
        method: "PATCH",
        json: { name: name.trim(), color, ...(isExpense && { monthlyBudget: budgetVal }) },
      });
      toast.success(`${name.trim()} saved`);
      notifyDataChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const uses = (category._count?.transactions ?? 0) + (category._count?.recurring ?? 0);

  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-2 py-2 sm:grid-cols-[auto_1fr_140px_auto]">
      <input
        type="color"
        aria-label={`${category.name} color`}
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className="size-8 cursor-pointer rounded-md border bg-transparent p-0.5"
      />
      <div className="min-w-0">
        <Input value={name} maxLength={50} onChange={(e) => setName(e.target.value)} aria-label="Category name" />
        <div className="mt-0.5 px-1 text-xs text-muted-foreground">
          {category.expenseGroup ? (category.expenseGroup === "FIXED" ? "Fixed" : "Variable") : "Income"} ·{" "}
          {uses === 0 ? "unused" : `${uses} use${uses === 1 ? "" : "s"}`}
        </div>
      </div>
      {isExpense ? (
        <Input
          className="col-span-3 col-start-2 sm:col-span-1 sm:col-start-auto"
          type="number"
          min="0"
          step="any"
          placeholder="No budget"
          aria-label={`${category.name} monthly budget`}
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
        />
      ) : (
        <span className="hidden sm:block" />
      )}
      <div className="col-start-3 row-start-1 flex justify-end sm:col-start-auto sm:row-start-auto">
        <Button variant="ghost" size="icon-sm" aria-label="Save" disabled={!dirty || saving} onClick={save}>
          <Save />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${category.name}`} onClick={() => onDelete(category)}>
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}

function NewCategoryForm() {
  const [name, setName] = useState("");
  const [type, setType] = useState("EXPENSE");
  const [group, setGroup] = useState("VARIABLE");
  const [color, setColor] = useState("#64748b");
  const [budget, setBudget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function create(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const budgetVal = budget.trim() === "" ? null : Number(budget);
    if (!name.trim()) return setError("Name is required");
    if (budgetVal != null && (!Number.isFinite(budgetVal) || budgetVal <= 0)) return setError("Budget must be greater than 0");
    setSaving(true);
    setError(null);
    try {
      await api("/api/categories", {
        method: "POST",
        json: {
          name: name.trim(),
          type,
          color,
          expenseGroup: type === "EXPENSE" ? group : null,
          monthlyBudget: type === "EXPENSE" ? budgetVal : null,
        },
      });
      toast.success(`Category "${name.trim()}" created`);
      setName("");
      setBudget("");
      notifyDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={create} className="grid gap-3 rounded-lg border border-dashed p-3">
      <div className="text-sm font-medium">New category</div>
      <div className="grid gap-2 sm:grid-cols-[auto_1fr_130px_130px_120px_auto] sm:items-center">
        <input
          type="color"
          aria-label="New category color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="size-8 cursor-pointer rounded-md border bg-transparent p-0.5"
        />
        <Input placeholder="Name" maxLength={50} value={name} onChange={(e) => setName(e.target.value)} aria-label="New category name" />
        <SimpleSelect
          aria-label="New category type"
          value={type}
          onChange={(v) => setType(v || "EXPENSE")}
          options={[
            { value: "EXPENSE", label: "Expense" },
            { value: "INCOME", label: "Income" },
          ]}
        />
        <SimpleSelect
          aria-label="Expense group"
          value={group}
          onChange={(v) => setGroup(v || "VARIABLE")}
          disabled={type !== "EXPENSE"}
          options={[
            { value: "FIXED", label: "Fixed" },
            { value: "VARIABLE", label: "Variable" },
          ]}
        />
        <Input
          type="number"
          min="0"
          step="any"
          placeholder="Budget"
          disabled={type !== "EXPENSE"}
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          aria-label="New category monthly budget"
        />
        <Button type="submit" disabled={saving}>
          <Plus />
          Add
        </Button>
      </div>
      <ErrorNote message={error} />
    </form>
  );
}

function CategoriesManager() {
  const { data, error } = useApi<Category[]>("/api/categories");
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const expense = (data ?? []).filter((c) => c.type === "EXPENSE");
  const income = (data ?? []).filter((c) => c.type === "INCOME");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categories & budgets</CardTitle>
        <CardDescription>Set optional monthly budgets for expense categories. Categories in use can&apos;t be deleted.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <ErrorNote message={error} />
        {[
          { title: "Expenses", list: expense },
          { title: "Income", list: income },
        ].map(({ title, list }) => (
          <div key={title}>
            <div className="mb-1 flex items-center justify-between text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <span>{title}</span>
              {title === "Expenses" && <span className="hidden w-[140px] sm:mr-16 sm:block">Monthly budget</span>}
            </div>
            <ul className="divide-y">
              {list.map((c) => (
                <CategoryRow
                  key={`${c.id}|${c.name}|${c.color}|${c.monthlyBudget}`}
                  category={c}
                  onDelete={setToDelete}
                />
              ))}
            </ul>
          </div>
        ))}
        <NewCategoryForm />
      </CardContent>
      <ConfirmDialog
        open={toDelete != null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete "${toDelete?.name}"?`}
        description="Only unused categories can be deleted."
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await api(`/api/categories/${toDelete.id}`, { method: "DELETE" });
            toast.success("Category deleted");
            notifyDataChanged();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Delete failed");
          }
        }}
      />
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" />
      <CurrencySettings />
      <CategoriesManager />
      <Card>
        <CardHeader>
          <CardTitle>Export data</CardTitle>
          <CardDescription>Download your data as CSV.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" render={<a href="/api/export?type=transactions" download />} nativeButton={false}>
            <Download />
            transactions.csv
          </Button>
          <Button variant="outline" render={<a href="/api/export?type=portfolio" download />} nativeButton={false}>
            <Download />
            portfolio.csv
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
