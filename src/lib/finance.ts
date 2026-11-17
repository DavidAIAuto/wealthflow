/**
 * Pure calculation helpers — no DB / network access. Unit tested in src/lib/__tests__.
 *
 * Date convention: calendar dates (transaction dates, due dates) are stored as
 * UTC 12:00 on that calendar day, so any viewer timezone (UTC-11..UTC+11) sees
 * the same day. Use `toStoredDate` / `dateKey` to convert.
 */
import { addMonths, addWeeks, addYears, addDays, format } from "date-fns";

export const CYCLES = ["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"] as const;
export type Cycle = (typeof CYCLES)[number];
export type TxType = "INCOME" | "EXPENSE";
export type ExpenseGroup = "FIXED" | "VARIABLE";

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/** "yyyy-MM-dd" for a stored (UTC-noon) date. */
export function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** "yyyy-MM-dd" for the viewer's local calendar day. */
export function localDateKey(d: Date = new Date()): string {
  return format(d, "yyyy-MM-dd");
}

/** Convert "yyyy-MM-dd" (or an ISO string / Date — only its date part is used) to UTC noon. */
export function toStoredDate(input: string | Date): Date {
  const key = typeof input === "string" ? input.slice(0, 10) : dateKey(input);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) throw new Error(`Invalid date: ${String(input)}`);
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  if (Number.isNaN(d.getTime()) || dateKey(d) !== key) throw new Error(`Invalid date: ${key}`);
  return d;
}

/** Today's local calendar day as a stored date. */
export function todayStored(now: Date = new Date()): Date {
  return toStoredDate(localDateKey(now));
}

/** [start, end) UTC range for a "yyyy-MM" month key. */
export function monthRange(monthKey: string): { start: Date; end: Date } {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!m) throw new Error(`Invalid month: ${monthKey}`);
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  if (mo < 0 || mo > 11) throw new Error(`Invalid month: ${monthKey}`);
  return { start: new Date(Date.UTC(y, mo, 1)), end: new Date(Date.UTC(y, mo + 1, 1)) };
}

export function currentMonthKey(now: Date = new Date()): string {
  return format(now, "yyyy-MM");
}

// ---------------------------------------------------------------------------
// Recurring items
// ---------------------------------------------------------------------------

export function monthlyNormalized(amount: number, cycle: Cycle): number {
  switch (cycle) {
    case "WEEKLY":
      return (amount * 52) / 12;
    case "MONTHLY":
      return amount;
    case "QUARTERLY":
      return amount / 3;
    case "YEARLY":
      return amount / 12;
  }
}

export function totalMonthlyBurn(
  items: { amount: number; cycle: string; isActive: boolean }[],
): number {
  return items
    .filter((i) => i.isActive)
    .reduce((sum, i) => sum + monthlyNormalized(i.amount, i.cycle as Cycle), 0);
}

/** Advance a stored due date by one billing cycle (calendar-aware, e.g. Jan 31 + 1 month = Feb 28/29). */
export function advanceDueDate(d: Date, cycle: Cycle): Date {
  const local = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  let next: Date;
  switch (cycle) {
    case "WEEKLY":
      next = addWeeks(local, 1);
      break;
    case "MONTHLY":
      next = addMonths(local, 1);
      break;
    case "QUARTERLY":
      next = addMonths(local, 3);
      break;
    case "YEARLY":
      next = addYears(local, 1);
      break;
  }
  return new Date(Date.UTC(next.getFullYear(), next.getMonth(), next.getDate(), 12));
}

export type RecurringStatus = "OVERDUE" | "DUE_SOON" | "ACTIVE" | "PAUSED";

/** True when the stored date is on or before today + `days` (includes overdue). */
export function isDueWithin(due: Date, days: number, now: Date = new Date()): boolean {
  return dateKey(due) <= localDateKey(addDays(now, days));
}

export function recurringStatus(
  item: { isActive: boolean; nextDueDate: Date },
  now: Date = new Date(),
): RecurringStatus {
  if (!item.isActive) return "PAUSED";
  if (dateKey(item.nextDueDate) < localDateKey(now)) return "OVERDUE";
  if (isDueWithin(item.nextDueDate, 7, now)) return "DUE_SOON";
  return "ACTIVE";
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export function summarizeTransactions(txs: { type: string; amount: number }[]) {
  let income = 0;
  let expenses = 0;
  for (const t of txs) {
    if (t.type === "INCOME") income += t.amount;
    else if (t.type === "EXPENSE") expenses += t.amount;
  }
  return { income, expenses, net: income - expenses };
}

export type CategoryLike = {
  id: number;
  name: string;
  type: string;
  color: string;
  expenseGroup: string | null;
  monthlyBudget: number | null;
};

export type CategorySpend = {
  categoryId: number;
  name: string;
  color: string;
  spent: number;
  budget: number | null;
  /** "over" > 100% of budget, "near" >= 80%, otherwise "ok" (also when no budget). */
  status: "over" | "near" | "ok";
};

/** Expense per category for the given transactions (expense categories with spend or a budget). */
export function spendByCategory(
  txs: { type: string; amount: number; categoryId: number }[],
  categories: CategoryLike[],
): CategorySpend[] {
  const spent = new Map<number, number>();
  for (const t of txs) {
    if (t.type !== "EXPENSE") continue;
    spent.set(t.categoryId, (spent.get(t.categoryId) ?? 0) + t.amount);
  }
  return categories
    .filter((c) => c.type === "EXPENSE")
    .map((c) => {
      const s = spent.get(c.id) ?? 0;
      const budget = c.monthlyBudget ?? null;
      let status: CategorySpend["status"] = "ok";
      if (budget != null && budget > 0) {
        if (s > budget) status = "over";
        else if (s >= budget * 0.8) status = "near";
      }
      return { categoryId: c.id, name: c.name, color: c.color, spent: s, budget, status };
    })
    .filter((c) => c.spent > 0 || c.budget != null)
    .sort((a, b) => b.spent - a.spent);
}

export function fixedVsVariable(
  txs: { type: string; amount: number; category: { expenseGroup: string | null } }[],
): { fixed: number; variable: number } {
  let fixed = 0;
  let variable = 0;
  for (const t of txs) {
    if (t.type !== "EXPENSE") continue;
    if (t.category.expenseGroup === "FIXED") fixed += t.amount;
    else variable += t.amount;
  }
  return { fixed, variable };
}

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------

export type HoldingWithPrice = {
  id: number;
  ticker: string;
  companyName: string | null;
  shares: number;
  avgCostBasis: number | null;
  closingPrice: number | null;
  previousClose: number | null;
  currency: string;
  fetchedAt: Date | string | null;
};

export type ComputedHolding = HoldingWithPrice & {
  marketValue: number;
  dayChangeAmount: number;
  dayChangePercent: number;
  totalGainAmount: number | null;
  totalGainPercent: number | null;
  allocationPercent: number;
};

export function computeHolding(h: HoldingWithPrice, totalPortfolioValue: number): ComputedHolding {
  const price = h.closingPrice;
  if (price == null) {
    return {
      ...h,
      marketValue: 0,
      dayChangeAmount: 0,
      dayChangePercent: 0,
      totalGainAmount: null,
      totalGainPercent: null,
      allocationPercent: 0,
    };
  }
  const marketValue = h.shares * price;
  const prev = h.previousClose;
  const cost = h.avgCostBasis;
  return {
    ...h,
    marketValue,
    dayChangeAmount: prev ? h.shares * (price - prev) : 0,
    dayChangePercent: prev ? ((price - prev) / prev) * 100 : 0,
    totalGainAmount: cost != null ? h.shares * (price - cost) : null,
    totalGainPercent: cost != null && cost > 0 ? ((price - cost) / cost) * 100 : null,
    allocationPercent: totalPortfolioValue > 0 ? (marketValue / totalPortfolioValue) * 100 : 0,
  };
}

export function computeHoldings(holdings: HoldingWithPrice[]): ComputedHolding[] {
  const total = holdings.reduce(
    (s, h) => s + (h.closingPrice != null ? h.shares * h.closingPrice : 0),
    0,
  );
  return holdings.map((h) => computeHolding(h, total));
}

export type PortfolioSummary = {
  totalValue: number;
  dayChangeAmount: number;
  dayChangePercent: number;
  totalCost: number;
  totalGainAmount: number;
  totalGainPercent: number;
  /** Number of holdings that have a cost basis (gain figures only cover these). */
  costBasisCount: number;
};

export function portfolioSummary(rows: ComputedHolding[]): PortfolioSummary {
  let totalValue = 0;
  let dayChangeAmount = 0;
  let totalCost = 0;
  let gainValue = 0;
  let costBasisCount = 0;
  for (const r of rows) {
    totalValue += r.marketValue;
    dayChangeAmount += r.dayChangeAmount;
    if (r.avgCostBasis != null && r.closingPrice != null) {
      costBasisCount++;
      totalCost += r.shares * r.avgCostBasis;
      gainValue += r.marketValue;
    }
  }
  const prevValue = totalValue - dayChangeAmount;
  const totalGainAmount = gainValue - totalCost;
  return {
    totalValue,
    dayChangeAmount,
    dayChangePercent: prevValue > 0 ? (dayChangeAmount / prevValue) * 100 : 0,
    totalCost,
    totalGainAmount,
    totalGainPercent: totalCost > 0 ? (totalGainAmount / totalCost) * 100 : 0,
    costBasisCount,
  };
}

/**
 * Converted portfolio total in base currency, or null when no conversion applies
 * (base currency is USD or the FX multiplier is 1).
 */
export function convertUsdToBase(
  usdAmount: number,
  settings: { baseCurrency: string; usdToBaseFx: number },
): number | null {
  if (settings.baseCurrency === "USD" || settings.usdToBaseFx === 1) return null;
  return usdAmount * settings.usdToBaseFx;
}
