import { beforeEach, describe, expect, it, vi } from "vitest";

// --- mocks ---------------------------------------------------------------
type CacheRow = { ticker: string; closingPrice: number; previousClose: number | null; currency: string; fetchedAt: Date };
vi.mock("server-only", () => ({}));

const { quoteMock, db } = vi.hoisted(() => ({
  quoteMock: vi.fn(),
  db: {
    holdings: [] as { id: number; ticker: string; companyName: string | null; shares: number; avgCostBasis: number | null }[],
    cache: new Map<string, CacheRow>(),
  },
}));
vi.mock("yahoo-finance2", () => ({
  default: class {
    quote = quoteMock;
  },
}));

vi.mock("../db", () => ({
  prisma: {
    stockHolding: { findMany: async () => db.holdings },
    stockPriceCache: {
      findMany: async ({ where }: { where: { ticker: { in: string[] } } }) =>
        where.ticker.in.map((t) => db.cache.get(t)).filter(Boolean),
      upsert: async ({ where, create }: { where: { ticker: string }; create: CacheRow }) => {
        db.cache.set(where.ticker, { ...create });
      },
    },
    appSettings: { findUnique: async () => ({ id: 1, baseCurrency: "USD", usdToBaseFx: 1 }) },
  },
}));

import { CACHE_TTL_MS, STALE_WARNING, extractPrice, getPortfolio, isStale, lookupTicker } from "../stocks";

const HOUR = 60 * 60 * 1000;

beforeEach(() => {
  quoteMock.mockReset();
  db.holdings = [{ id: 1, ticker: "AAPL", companyName: "Apple", shares: 2, avgCostBasis: 100 }];
  db.cache = new Map();
});

describe("cache freshness", () => {
  it("is stale when missing or older than 12h", () => {
    const now = Date.now();
    expect(isStale(null, now)).toBe(true);
    expect(isStale(new Date(now - 11 * HOUR), now)).toBe(false);
    expect(isStale(new Date(now - CACHE_TTL_MS - 1), now)).toBe(true);
  });
});

describe("extractPrice", () => {
  it("prefers regularMarketPrice and falls back to previous close", () => {
    expect(extractPrice({ regularMarketPrice: 10, regularMarketPreviousClose: 9, currency: "EUR" })).toEqual({
      closingPrice: 10,
      previousClose: 9,
      currency: "EUR",
    });
    expect(extractPrice({ regularMarketPreviousClose: 9 })).toEqual({ closingPrice: 9, previousClose: 9, currency: "USD" });
    expect(extractPrice({ regularMarketPrice: 5 })).toEqual({ closingPrice: 5, previousClose: 5, currency: "USD" });
    expect(extractPrice({})).toBeNull();
    expect(extractPrice(undefined)).toBeNull();
  });
});

describe("lookupTicker", () => {
  it("rejects unknown symbols", async () => {
    quoteMock.mockResolvedValue([]);
    expect(await lookupTicker("NOPE")).toEqual({ ok: false, reason: "invalid" });
  });
  it("reports provider outages separately", async () => {
    quoteMock.mockRejectedValue(new Error("fetch failed"));
    expect(await lookupTicker("AAPL")).toEqual({ ok: false, reason: "unavailable" });
  });
});

describe("getPortfolio", () => {
  it("fetches missing prices and returns fresh data", async () => {
    quoteMock.mockResolvedValue([{ symbol: "AAPL", regularMarketPrice: 200, regularMarketPreviousClose: 190 }]);
    const res = await getPortfolio();
    expect(quoteMock).toHaveBeenCalledTimes(1);
    expect(res.stale).toBe(false);
    expect(res.warning).toBeUndefined();
    expect(res.summary.totalValue).toBe(400);
  });

  it("skips the network when the cache is fresh", async () => {
    db.cache.set("AAPL", { ticker: "AAPL", closingPrice: 150, previousClose: 140, currency: "USD", fetchedAt: new Date() });
    const res = await getPortfolio();
    expect(quoteMock).not.toHaveBeenCalled();
    expect(res.summary.totalValue).toBe(300);
  });

  it("keeps the last cached close and flags stale when Yahoo fails", async () => {
    db.cache.set("AAPL", {
      ticker: "AAPL",
      closingPrice: 150,
      previousClose: 140,
      currency: "USD",
      fetchedAt: new Date(Date.now() - 24 * HOUR),
    });
    quoteMock.mockRejectedValue(new Error("Too Many Requests"));
    const res = await getPortfolio();
    expect(res.stale).toBe(true);
    expect(res.warning).toBe(STALE_WARNING);
    expect(res.holdings[0].closingPrice).toBe(150);
    expect(res.summary.totalValue).toBe(300);
  });

  it("force refresh ignores a fresh cache", async () => {
    db.cache.set("AAPL", { ticker: "AAPL", closingPrice: 150, previousClose: 140, currency: "USD", fetchedAt: new Date() });
    quoteMock.mockResolvedValue([{ symbol: "AAPL", regularMarketPrice: 210, regularMarketPreviousClose: 200 }]);
    const res = await getPortfolio({ sync: "force" });
    expect(quoteMock).toHaveBeenCalledTimes(1);
    expect(res.holdings[0].closingPrice).toBe(210);
  });
});
