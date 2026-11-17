import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, parseId, readJson, zodError } from "@/lib/api";
import { StockHoldingPatch } from "@/lib/validators";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/portfolio/[id]">) {
  const id = parseId((await ctx.params).id);
  if (!id) return jsonError("Invalid id");
  const existing = await prisma.stockHolding.findUnique({ where: { id } });
  if (!existing) return jsonError("Holding not found", 404);

  const parsed = StockHoldingPatch.safeParse(await readJson(req));
  if (!parsed.success) return zodError(parsed.error);

  const holding = await prisma.stockHolding.update({ where: { id }, data: parsed.data });
  return NextResponse.json(holding);
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/portfolio/[id]">) {
  const id = parseId((await ctx.params).id);
  if (!id) return jsonError("Invalid id");
  const existing = await prisma.stockHolding.findUnique({ where: { id } });
  if (!existing) return jsonError("Holding not found", 404);

  await prisma.$transaction([
    prisma.stockHolding.delete({ where: { id } }),
    prisma.stockPriceCache.deleteMany({ where: { ticker: existing.ticker } }),
  ]);
  return NextResponse.json({ ok: true });
}
