import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, readJson, zodError } from "@/lib/api";
import { getPortfolio, lookupTicker, upsertPriceCache } from "@/lib/stocks";
import { StockHoldingInput } from "@/lib/validators";

/** Holdings + cached prices; auto-refreshes any ticker whose cache is missing or > 12h old. */
export async function GET() {
  return NextResponse.json(await getPortfolio({ sync: "auto" }));
}

export async function POST(req: NextRequest) {
  const parsed = StockHoldingInput.safeParse(await readJson(req));
  if (!parsed.success) return zodError(parsed.error);
  const input = parsed.data;

  const lookup = await lookupTicker(input.ticker);
  if (!lookup.ok) {
    return lookup.reason === "invalid"
      ? jsonError("Invalid or unsupported ticker symbol", 400)
      : jsonError("Could not reach the market data provider. Please try again shortly.", 503);
  }

  const data = {
    shares: input.shares,
    avgCostBasis: input.avgCostBasis ?? null,
    companyName: lookup.companyName,
  };
  const holding = await prisma.stockHolding.upsert({
    where: { ticker: input.ticker },
    update: data,
    create: { ticker: input.ticker, ...data },
  });
  await upsertPriceCache(input.ticker, lookup.price);

  return NextResponse.json({ holding, price: lookup.price }, { status: 201 });
}
