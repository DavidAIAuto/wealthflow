import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, parseId, readJson, zodError } from "@/lib/api";
import { CategoryPatch } from "@/lib/validators";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/categories/[id]">) {
  const id = parseId((await ctx.params).id);
  if (!id) return jsonError("Invalid id");
  const existing = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { transactions: true, recurring: true } } },
  });
  if (!existing) return jsonError("Category not found", 404);

  const parsed = CategoryPatch.safeParse(await readJson(req));
  if (!parsed.success) return zodError(parsed.error);
  const input = parsed.data;

  const type = input.type ?? existing.type;
  if (type !== existing.type && existing._count.transactions + existing._count.recurring > 0) {
    return jsonError("Can't change the type of a category that is already in use", 409);
  }
  if (input.name && input.name !== existing.name) {
    const dupe = await prisma.category.findUnique({ where: { name: input.name } });
    if (dupe) return jsonError(`A category named "${input.name}" already exists`, 409);
  }

  const isIncome = type === "INCOME";
  const category = await prisma.category.update({
    where: { id },
    data: {
      type,
      ...(input.name !== undefined && { name: input.name }),
      ...(input.color !== undefined && { color: input.color }),
      expenseGroup: isIncome ? null : (input.expenseGroup ?? existing.expenseGroup ?? "VARIABLE"),
      monthlyBudget: isIncome
        ? null
        : input.monthlyBudget !== undefined
          ? input.monthlyBudget
          : existing.monthlyBudget,
    },
  });
  return NextResponse.json(category);
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/categories/[id]">) {
  const id = parseId((await ctx.params).id);
  if (!id) return jsonError("Invalid id");
  const existing = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { transactions: true, recurring: true } } },
  });
  if (!existing) return jsonError("Category not found", 404);

  const { transactions, recurring } = existing._count;
  if (transactions + recurring > 0) {
    const parts = [];
    if (transactions) parts.push(`${transactions} transaction${transactions === 1 ? "" : "s"}`);
    if (recurring) parts.push(`${recurring} recurring item${recurring === 1 ? "" : "s"}`);
    return jsonError(
      `"${existing.name}" is used by ${parts.join(" and ")}. Reassign or delete those first.`,
      409,
    );
  }
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
