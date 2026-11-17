import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, parseId } from "@/lib/api";
import { advanceDueDate, todayStored, type Cycle } from "@/lib/finance";

/** Log one payment: create an EXPENSE transaction and advance the due date atomically. */
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/subscriptions/[id]/log">) {
  const id = parseId((await ctx.params).id);
  if (!id) return jsonError("Invalid id");

  const item = await prisma.recurringItem.findUnique({ where: { id } });
  if (!item) return jsonError("Subscription not found", 404);

  const [transaction, recurringItem] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        type: "EXPENSE",
        amount: item.amount,
        categoryId: item.categoryId,
        description: item.name,
        date: todayStored(),
      },
      include: { category: true },
    }),
    prisma.recurringItem.update({
      where: { id },
      data: { nextDueDate: advanceDueDate(item.nextDueDate, item.cycle as Cycle) },
      include: { category: true },
    }),
  ]);

  return NextResponse.json({ transaction, recurringItem }, { status: 201 });
}
