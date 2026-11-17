import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { dateKey } from "@/lib/finance";
import { getPortfolio } from "@/lib/stocks";

type Cell = string | number | null | undefined;

function csvCell(v: Cell): string {
  if (v == null) return "";
  let s = String(v);
  // Neutralize spreadsheet formula injection for text cells.
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(header: string[], rows: Cell[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function csvResponse(filename: string, body: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

const round = (n: number | null, d = 2) => (n == null ? null : Number(n.toFixed(d)));

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");

  if (type === "transactions") {
    const txs = await prisma.transaction.findMany({
      include: { category: true },
      orderBy: [{ date: "desc" }, { id: "desc" }],
    });
    const body = toCsv(
      ["id", "date", "type", "category", "description", "amount"],
      txs.map((t) => [t.id, dateKey(t.date), t.type, t.category.name, t.description, t.amount]),
    );
    return csvResponse("transactions.csv", body);
  }

  if (type === "portfolio") {
    const { holdings } = await getPortfolio({ sync: "none" });
    const body = toCsv(
      [
        "ticker",
        "company",
        "shares",
        "avg_cost_basis",
        "latest_close",
        "currency",
        "market_value",
        "allocation_pct",
        "day_change",
        "unrealized_gain",
        "price_fetched_at",
      ],
      holdings.map((h) => [
        h.ticker,
        h.companyName,
        h.shares,
        h.avgCostBasis,
        h.closingPrice,
        h.currency,
        round(h.marketValue),
        round(h.allocationPercent),
        round(h.dayChangeAmount),
        round(h.totalGainAmount),
        h.fetchedAt ? new Date(h.fetchedAt).toISOString() : null,
      ]),
    );
    return csvResponse("portfolio.csv", body);
  }

  return jsonError("type must be 'transactions' or 'portfolio'");
}
