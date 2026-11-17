import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, parseId, readJson, zodError } from "@/lib/api";
import { toStoredDate } from "@/lib/finance";
import { RecurringItemPatch } from "@/lib/validators";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/subscriptions/[id]">) {
  const id = parseId((await ctx.params).id);
  if (!id) return jsonError("Invalid id");
  const existing = await prisma.recurringItem.findUnique({ where: { id } });
  if (!existing) return jsonError("Subscription not found", 404);

  const parsed = RecurringItemPatch.safeParse(await readJson(req));
  if (!parsed.success) return zodError(parsed.error);
  const { nextDueDate, ...rest } = parsed.data;

  if (rest.categoryId !== undefined) {
    const category = await prisma.category.findUnique({ where: { id: rest.categoryId } });
    if (!category) return jsonError("Category not found");
    if (category.type !== "EXPENSE") return jsonError("Recurring items must use an expense category");
  }

  const item = await prisma.recurringItem.update({
    where: { id },
    data: {
      ...rest,
      ...(nextDueDate !== undefined && { nextDueDate: toStoredDate(nextDueDate) }),
    },
    include: { category: true },
  });
  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/subscriptions/[id]">) {
  const id = parseId((await ctx.params).id);
  if (!id) return jsonError("Invalid id");
  const result = await prisma.recurringItem.deleteMany({ where: { id } });
  if (result.count === 0) return jsonError("Subscription not found", 404);
  return NextResponse.json({ ok: true });
}
