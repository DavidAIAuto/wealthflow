/** JSON shapes returned by the API routes (dates arrive as ISO strings). */
import type { ComputedHolding, PortfolioSummary } from "./finance";

export type Category = {
  id: number;
  name: string;
  type: "INCOME" | "EXPENSE";
  expenseGroup: "FIXED" | "VARIABLE" | null;
  color: string;
  monthlyBudget: number | null;
  isDefault: boolean;
  _count?: { transactions: number; recurring: number };
};

export type Transaction = {
  id: number;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string | null;
  date: string;
  categoryId: number;
  category: Category;
  createdAt: string;
};

export type TransactionsResponse = {
  transactions: Transaction[];
  summary: { income: number; expenses: number; net: number };
};

export type RecurringItem = {
  id: number;
  name: string;
  amount: number;
  cycle: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
  nextDueDate: string;
  isActive: boolean;
  categoryId: number;
  category: Category;
  createdAt: string;
};

export type Settings = { id: number; baseCurrency: string; usdToBaseFx: number };

export type Holding = Omit<ComputedHolding, "fetchedAt"> & { fetchedAt: string | null };

export type PortfolioResponse = {
  holdings: Holding[];
  summary: PortfolioSummary;
  settings: { baseCurrency: string; usdToBaseFx: number };
  convertedTotal: number | null;
  lastUpdated: string | null;
  stale: boolean;
  warning?: string;
};
