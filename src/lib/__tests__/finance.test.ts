import { describe, expect, it } from "vitest";
import {
  advanceDueDate,
  computeHoldings,
  convertUsdToBase,
  dateKey,
  fixedVsVariable,
  isDueWithin,
  monthRange,
  monthlyNormalized,
  portfolioSummary,
  recurringStatus,
  spendByCategory,
  summarizeTransactions,
  toStoredDate,
  totalMonthlyBurn,
  type HoldingWithPrice,
} from "../finance";

describe("monthlyNormalized", () => {
  it("normalizes each cycle to a monthly amount", () => {
    expect(monthlyNormalized(10, "WEEKLY")).toBeCloseTo((10 * 52) / 12);
    expect(monthlyNormalized(1200, "MONTHLY")).toBe(1200);
    expect(monthlyNormalized(90, "QUARTERLY")).toBe(30);
    expect(monthlyNormalized(120, "YEARLY")).toBe(10);
  });

  it("sums only active items", () => {
    const burn = totalMonthlyBurn([
      { amount: 1000, cycle: "MONTHLY", isActive: true },
      { amount: 120, cycle: "YEARLY", isActive: true },
      { amount: 500, cycle: "MONTHLY", isActive: false },
    ]);
    expect(burn).toBe(1010);
  });
});

describe("advanceDueDate", () => {
  const adv = (key: string, cycle: Parameters<typeof advanceDueDate>[1]) =>
    dateKey(advanceDueDate(toStoredDate(key), cycle));

  it("clamps month-end dates (Jan 31 + 1 month)", () => {
    expect(adv("2026-01-31", "MONTHLY")).toBe("2026-02-28");
    expect(adv("2028-01-31", "MONTHLY")).toBe("2028-02-29"); // leap year
  });

  it("crosses year boundaries", () => {
    expect(adv("2026-12-15", "MONTHLY")).toBe("2027-01-15");
    expect(adv("2026-12-29", "WEEKLY")).toBe("2027-01-05");
    expect(adv("2026-11-30", "QUARTERLY")).toBe("2027-02-28");
    expect(adv("2028-02-29", "YEARLY")).toBe("2029-02-28");
  });

  it("advances weekly across a DST change without drifting a day", () => {
    expect(adv("2026-03-05", "WEEKLY")).toBe("2026-03-12");
    expect(adv("2026-10-29", "WEEKLY")).toBe("2026-11-05");
  });

  it("returns UTC noon", () => {
    expect(advanceDueDate(toStoredDate("2026-05-10"), "MONTHLY").toISOString()).toBe(
      "2026-06-10T12:00:00.000Z",
    );
  });
});

describe("dates & status", () => {
  const now = new Date(2026, 10, 17, 9, 30); // Nov 17 2026 local

  it("toStoredDate rejects invalid input", () => {
    expect(() => toStoredDate("2026-02-30")).toThrow();
    expect(() => toStoredDate("nope")).toThrow();
  });

  it("monthRange is [start, end)", () => {
    const { start, end } = monthRange("2026-12");
    expect(start.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("classifies recurring status", () => {
    const s = (key: string, isActive = true) =>
      recurringStatus({ isActive, nextDueDate: toStoredDate(key) }, now);
    expect(s("2026-11-16")).toBe("OVERDUE");
    expect(s("2026-11-17")).toBe("DUE_SOON");
    expect(s("2026-11-24")).toBe("DUE_SOON");
    expect(s("2026-11-25")).toBe("ACTIVE");
    expect(s("2026-11-01", false)).toBe("PAUSED");
  });

  it("isDueWithin includes overdue items", () => {
    expect(isDueWithin(toStoredDate("2026-11-01"), 7, now)).toBe(true);
    expect(isDueWithin(toStoredDate("2026-12-01"), 7, now)).toBe(false);
  });
});

describe("transactions", () => {
  const cats = [
    { id: 1, name: "Rent", type: "EXPENSE", color: "#f00", expenseGroup: "FIXED", monthlyBudget: 1000 },
    { id: 2, name: "Food", type: "EXPENSE", color: "#0f0", expenseGroup: "VARIABLE", monthlyBudget: 300 },
    { id: 3, name: "Fun", type: "EXPENSE", color: "#00f", expenseGroup: "VARIABLE", monthlyBudget: null },
    { id: 4, name: "Salary", type: "INCOME", color: "#0f0", expenseGroup: null, monthlyBudget: null },
  ];
  const txs = [
    { type: "INCOME", amount: 3000, categoryId: 4, category: cats[3] },
    { type: "EXPENSE", amount: 1000, categoryId: 1, category: cats[0] },
    { type: "EXPENSE", amount: 250, categoryId: 2, category: cats[1] },
    { type: "EXPENSE", amount: 100, categoryId: 2, category: cats[1] },
  ];

  it("summarizes income, expenses and net", () => {
    expect(summarizeTransactions(txs)).toEqual({ income: 3000, expenses: 1350, net: 1650 });
  });

  it("computes spend per category with budget status", () => {
    const res = spendByCategory(txs, cats);
    expect(res.map((r) => [r.name, r.spent, r.status])).toEqual([
      ["Rent", 1000, "near"],
      ["Food", 350, "over"],
    ]);
  });

  it("splits fixed vs variable", () => {
    expect(fixedVsVariable(txs)).toEqual({ fixed: 1000, variable: 350 });
  });
});

describe("portfolio", () => {
  const base = { companyName: null, currency: "USD", fetchedAt: null };
  const holdings: HoldingWithPrice[] = [
    { ...base, id: 1, ticker: "AAPL", shares: 10, avgCostBasis: 150, closingPrice: 200, previousClose: 190 },
    { ...base, id: 2, ticker: "VOO", shares: 2.5, avgCostBasis: null, closingPrice: 400, previousClose: 400 },
    { ...base, id: 3, ticker: "ZERO", shares: 1, avgCostBasis: 0, closingPrice: 1000, previousClose: null },
  ];

  it("computes value, day change, gains and allocation", () => {
    const [a, v, z] = computeHoldings(holdings);
    expect(a.marketValue).toBe(2000);
    expect(a.dayChangeAmount).toBe(100);
    expect(a.dayChangePercent).toBeCloseTo(5.263, 3);
    expect(a.totalGainAmount).toBe(500);
    expect(a.totalGainPercent).toBeCloseTo(33.333, 3);
    expect(a.allocationPercent).toBeCloseTo(50);

    expect(v.marketValue).toBe(1000);
    expect(v.totalGainAmount).toBeNull();
    expect(v.totalGainPercent).toBeNull();
    expect(v.allocationPercent).toBeCloseTo(25);

    // avgCostBasis 0: gain amount defined, percent undefined; no previous close → 0 change
    expect(z.totalGainAmount).toBe(1000);
    expect(z.totalGainPercent).toBeNull();
    expect(z.dayChangeAmount).toBe(0);
    expect(z.dayChangePercent).toBe(0);
  });

  it("summarizes the portfolio", () => {
    const s = portfolioSummary(computeHoldings(holdings));
    expect(s.totalValue).toBe(4000);
    expect(s.dayChangeAmount).toBe(100);
    expect(s.dayChangePercent).toBeCloseTo((100 / 3900) * 100);
    expect(s.totalCost).toBe(1500);
    expect(s.totalGainAmount).toBe(1500); // (2000 + 1000) - 1500
    expect(s.totalGainPercent).toBe(100);
    expect(s.costBasisCount).toBe(2);
  });

  it("handles an empty / zero-value portfolio", () => {
    expect(computeHoldings([])).toEqual([]);
    const [h] = computeHoldings([{ ...holdings[0], closingPrice: null }]);
    expect(h.marketValue).toBe(0);
    expect(h.allocationPercent).toBe(0);
    const s = portfolioSummary([h]);
    expect(s.totalValue).toBe(0);
    expect(s.dayChangePercent).toBe(0);
    expect(s.totalGainPercent).toBe(0);
  });

  it("converts USD to base currency only when applicable", () => {
    expect(convertUsdToBase(100, { baseCurrency: "USD", usdToBaseFx: 1 })).toBeNull();
    expect(convertUsdToBase(100, { baseCurrency: "NGN", usdToBaseFx: 1 })).toBeNull();
    expect(convertUsdToBase(100, { baseCurrency: "NGN", usdToBaseFx: 1500 })).toBe(150000);
  });
});
