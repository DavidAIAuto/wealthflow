import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { jsonError, readJson, zodError } from "@/lib/api";
import { monthRange, summarizeTransactions, toStoredDate } from "@/lib/finance";
import { TransactionInput } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const where: Prisma.TransactionWhereInput = {};

  const month = sp.get("month");
  if (month && month !== "all") {
    try {
      const { start, end } = monthRange(month);
      where.date = { gte: start, lt: end };
    } catch {
      return jsonError("month must be YYYY-MM or 'all'");
    }
  }
  const type = sp.get("type");
  if (type === "INCOME" || type === "EXPENSE") where.type = type;
  const categoryId = Number(sp.get("categoryId"));
  if (Number.isInteger(categoryId) && categoryId > 0) where.categoryId = categoryId;
  const q = sp.get("q")?.trim();
  if (q) where.description = { contains: q };

  const limitRaw = Number(sp.get("limit"));
  const take = Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 5000) : undefined;

  const [transactions, all] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take,
    }),
    // Summary always covers the full filtered set, even when `limit` is applied.
    take
      ? prisma.transaction.findMany({ where, select: { type: true, amount: true } })
      : Promise.resolve(null),
  ]);

  return NextResponse.json({
    transactions,
    summary: summarizeTransactions(all ?? transactions),
  });
}

export async function POST(req: NextRequest) {
  const parsed = TransactionInput.safeParse(await readJson(req));
  if (!parsed.success) return zodError(parsed.error);
  const input = parsed.data;

  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category) return jsonError("Category not found");
  if (category.type !== input.type) {
    return jsonError(`Category "${category.name}" is an ${category.type.toLowerCase()} category`);
  }

  const transaction = await prisma.transaction.create({
    data: {
      type: input.type,
      amount: input.amount,
      categoryId: input.categoryId,
      description: input.description,
      date: toStoredDate(input.date),
    },
    include: { category: true },
  });
  return NextResponse.json(transaction, { status: 201 });
}
