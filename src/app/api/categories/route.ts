import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, readJson, zodError } from "@/lib/api";
import { CategoryInput } from "@/lib/validators";

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: [{ type: "desc" }, { expenseGroup: "asc" }, { name: "asc" }],
    include: { _count: { select: { transactions: true, recurring: true } } },
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const parsed = CategoryInput.safeParse(await readJson(req));
  if (!parsed.success) return zodError(parsed.error);
  const input = parsed.data;

  const dupe = await prisma.category.findUnique({ where: { name: input.name } });
  if (dupe) return jsonError(`A category named "${input.name}" already exists`, 409);

  const isIncome = input.type === "INCOME";
  const category = await prisma.category.create({
    data: {
      name: input.name,
      type: input.type,
      color: input.color,
      expenseGroup: isIncome ? null : (input.expenseGroup ?? "VARIABLE"),
      monthlyBudget: isIncome ? null : (input.monthlyBudget ?? null),
    },
  });
  return NextResponse.json(category, { status: 201 });
}
