import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, parseId, readJson, zodError } from "@/lib/api";
import { toStoredDate } from "@/lib/finance";
import { TransactionPatch } from "@/lib/validators";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/transactions/[id]">) {
  const id = parseId((await ctx.params).id);
  if (!id) return jsonError("Invalid id");
  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing) return jsonError("Transaction not found", 404);

  const parsed = TransactionPatch.safeParse(await readJson(req));
  if (!parsed.success) return zodError(parsed.error);
  const input = parsed.data;

  const type = input.type ?? existing.type;
  const categoryId = input.categoryId ?? existing.categoryId;
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) return jsonError("Category not found");
  if (category.type !== type) {
    return jsonError(`Category "${category.name}" is an ${category.type.toLowerCase()} category`);
  }

  const transaction = await prisma.transaction.update({
    where: { id },
    data: {
      type,
      categoryId,
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.date !== undefined && { date: toStoredDate(input.date) }),
    },
    include: { category: true },
  });
  return NextResponse.json(transaction);
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/transactions/[id]">) {
  const id = parseId((await ctx.params).id);
  if (!id) return jsonError("Invalid id");
  const result = await prisma.transaction.deleteMany({ where: { id } });
  if (result.count === 0) return jsonError("Transaction not found", 404);
  return NextResponse.json({ ok: true });
}
