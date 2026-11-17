import "server-only";
import YahooFinance from "yahoo-finance2";
import { prisma } from "./db";
import {
  computeHoldings,
  convertUsdToBase,
  portfolioSummary,
  type ComputedHolding,
  type PortfolioSummary,
} from "./finance";

export const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
export const STALE_WARNING = "Could not refresh live prices; showing last cached close.";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

/** Minimal shape we read from a Yahoo quote (validation is disabled for resilience). */
type RawQuote = {
  symbol?: string;
  regularMarketPrice?: number | null;
  regularMarketPreviousClose?: number | null;
  currency?: string | null;
  shortName?: string | null;
  longName?: string | null;
};

export type ExtractedPrice = { closingPrice: number; previousClose: number; currency: string };

export function isStale(fetchedAt: Date | null | undefined, now = Date.now()): boolean {
  return !fetchedAt || now - fetchedAt.getTime() > CACHE_TTL_MS;
}

const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

export function extractPrice(q: RawQuote | null | undefined): ExtractedPrice | null {
  if (!q) return null;
  const closingPrice = isNum(q.regularMarketPrice)
    ? q.regularMarketPrice
    : isNum(q.regularMarketPreviousClose)
      ? q.regularMarketPreviousClose
      : null;
  if (closingPrice == null) return null;
  const previousClose = isNum(q.regularMarketPreviousClose) ? q.regularMarketPreviousClose : closingPrice;
  return { closingPrice, previousClose, currency: q.currency || "USD" };
}

async function quoteMany(tickers: string[]): Promise<RawQuote[]> {
  const res = (await yahooFinance.quote(tickers, { return: "array" }, { validateResult: false })) as unknown;
  return Array.isArray(res) ? (res as RawQuote[]) : [];
}

export type TickerLookup =
  | { ok: true; price: ExtractedPrice; companyName: string | null }
  | { ok: false; reason: "invalid" | "unavailable" };

/** Validate a ticker against Yahoo Finance (used when adding a holding). */
export async function lookupTicker(ticker: string): Promise<TickerLookup> {
  let quotes: RawQuote[];
  try {
    quotes = await quoteMany([ticker]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/not found|no data|invalid|unknown symbol/i.test(msg)) return { ok: false, reason: "invalid" };
    console.error("[stocks] lookup failed", ticker, msg);
    return { ok: false, reason: "unavailable" };
  }
  const q = quotes.find((x) => x.symbol?.toUpperCase() === ticker) ?? quotes[0];
  const price = extractPrice(q);
  if (!q || !price) return { ok: false, reason: "invalid" };
  return { ok: true, price, companyName: q.shortName || q.longName || null };
}

export async function upsertPriceCache(ticker: string, price: ExtractedPrice) {
  const data = { ...price, fetchedAt: new Date() };
  await prisma.stockPriceCache.upsert({
    where: { ticker },
    update: data,
    create: { ticker, ...data },
  });
}

/**
 * Refresh cached prices for stale/missing tickers (or all when `force`).
 * Never throws: on provider failure the existing cache is kept and `failed` is true.
 */
export async function syncPrices(tickers: string[], force = false): Promise<{ failed: boolean }> {
  if (tickers.length === 0) return { failed: false };
  let toFetch = tickers;
  if (!force) {
    const cache = await prisma.stockPriceCache.findMany({ where: { ticker: { in: tickers } } });
    const byTicker = new Map(cache.map((c) => [c.ticker, c]));
    toFetch = tickers.filter((t) => isStale(byTicker.get(t)?.fetchedAt));
  }
  if (toFetch.length === 0) return { failed: false };

  try {
    const quotes = await quoteMany(toFetch);
    let updated = 0;
    for (const q of quotes) {
      const symbol = q.symbol?.toUpperCase();
      const price = extractPrice(q);
      if (!symbol || !price || !toFetch.includes(symbol)) continue;
      await upsertPriceCache(symbol, price);
      updated++;
    }
    // Every requested ticker failed to resolve → treat as a provider failure.
    return { failed: updated === 0 };
  } catch (err) {
    console.error("[stocks] price sync failed:", err instanceof Error ? err.message : err);
    return { failed: true };
  }
}

export type PortfolioResponse = {
  holdings: ComputedHolding[];
  summary: PortfolioSummary;
  settings: { baseCurrency: string; usdToBaseFx: number };
  convertedTotal: number | null;
  lastUpdated: string | null;
  stale: boolean;
  warning?: string;
};

/** Load holdings merged with cached prices (optionally syncing first). */
export async function getPortfolio(opts: { sync?: "auto" | "force" | "none" } = {}): Promise<PortfolioResponse> {
  const sync = opts.sync ?? "auto";
  const holdings = await prisma.stockHolding.findMany({ orderBy: { ticker: "asc" } });
  const tickers = holdings.map((h) => h.ticker);

  let failed = false;
  if (sync !== "none") failed = (await syncPrices(tickers, sync === "force")).failed;

  const [cache, settingsRow] = await Promise.all([
    prisma.stockPriceCache.findMany({ where: { ticker: { in: tickers } } }),
    prisma.appSettings.findUnique({ where: { id: 1 } }),
  ]);
  const settings = {
    baseCurrency: settingsRow?.baseCurrency ?? "USD",
    usdToBaseFx: settingsRow?.usdToBaseFx ?? 1,
  };
  const byTicker = new Map(cache.map((c) => [c.ticker, c]));

  const rows = computeHoldings(
    holdings.map((h) => {
      const c = byTicker.get(h.ticker);
      return {
        id: h.id,
        ticker: h.ticker,
        companyName: h.companyName,
        shares: h.shares,
        avgCostBasis: h.avgCostBasis,
        closingPrice: c?.closingPrice ?? null,
        previousClose: c?.previousClose ?? null,
        currency: c?.currency ?? "USD",
        fetchedAt: c?.fetchedAt ?? null,
      };
    }),
  );
  const summary = portfolioSummary(rows);

  const fetchedTimes = cache.map((c) => c.fetchedAt.getTime());
  const lastUpdated = fetchedTimes.length ? new Date(Math.max(...fetchedTimes)).toISOString() : null;
  const anyStale = holdings.some((h) => isStale(byTicker.get(h.ticker)?.fetchedAt));
  const stale = failed || anyStale;

  // Conversion applies to the USD-denominated portion only.
  const usdValue = rows.filter((r) => r.currency === "USD").reduce((s, r) => s + r.marketValue, 0);
  const convertedTotal = rows.length ? convertUsdToBase(usdValue, settings) : null;

  return {
    holdings: rows,
    summary,
    settings,
    convertedTotal,
    lastUpdated,
    stale,
    ...(failed ? { warning: STALE_WARNING } : {}),
  };
}
