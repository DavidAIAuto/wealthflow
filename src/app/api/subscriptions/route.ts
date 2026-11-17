import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, readJson, zodError } from "@/lib/api";
import { toStoredDate } from "@/lib/finance";
import { RecurringItemInput } from "@/lib/validators";

export async function GET() {
  const items = await prisma.recurringItem.findMany({
    include: { category: true },
    orderBy: [{ isActive: "desc" }, { nextDueDate: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const parsed = RecurringItemInput.safeParse(await readJson(req));
  if (!parsed.success) return zodError(parsed.error);
  const input = parsed.data;

  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category) return jsonError("Category not found");
  if (category.type !== "EXPENSE") return jsonError("Recurring items must use an expense category");

  const item = await prisma.recurringItem.create({
    data: { ...input, nextDueDate: toStoredDate(input.nextDueDate) },
    include: { category: true },
  });
  return NextResponse.json(item, { status: 201 });
}
