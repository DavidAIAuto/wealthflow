import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  }),
});

type SeedCategory = {
  name: string;
  type: "INCOME" | "EXPENSE";
  expenseGroup: "FIXED" | "VARIABLE" | null;
  color: string;
};

const categories: SeedCategory[] = [
  { name: "Rent & Housing", type: "EXPENSE", expenseGroup: "FIXED", color: "#ef4444" },
  { name: "Subscriptions", type: "EXPENSE", expenseGroup: "FIXED", color: "#8b5cf6" },
  { name: "Utilities & Internet", type: "EXPENSE", expenseGroup: "FIXED", color: "#f59e0b" },
  { name: "Insurance & Healthcare", type: "EXPENSE", expenseGroup: "FIXED", color: "#ec4899" },
  { name: "Food & Groceries", type: "EXPENSE", expenseGroup: "VARIABLE", color: "#10b981" },
  { name: "Dining Out", type: "EXPENSE", expenseGroup: "VARIABLE", color: "#14b8a6" },
  { name: "Transportation", type: "EXPENSE", expenseGroup: "VARIABLE", color: "#3b82f6" },
  { name: "Shopping & Personal", type: "EXPENSE", expenseGroup: "VARIABLE", color: "#6366f1" },
  { name: "Entertainment", type: "EXPENSE", expenseGroup: "VARIABLE", color: "#a855f7" },
  { name: "Miscellaneous", type: "EXPENSE", expenseGroup: "VARIABLE", color: "#64748b" },
  { name: "Salary", type: "INCOME", expenseGroup: null, color: "#22c55e" },
  { name: "Freelance & Side Hustle", type: "INCOME", expenseGroup: null, color: "#06b6d4" },
  { name: "Dividends & Interest", type: "INCOME", expenseGroup: null, color: "#84cc16" },
  { name: "Other Income", type: "INCOME", expenseGroup: null, color: "#94a3b8" },
];

async function main() {
  await prisma.appSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, baseCurrency: "USD", usdToBaseFx: 1.0 },
  });

  for (const c of categories) {
    // Only create / restore type metadata; never clobber user-edited color or budget.
    await prisma.category.upsert({
      where: { name: c.name },
      update: { type: c.type, expenseGroup: c.expenseGroup, isDefault: true },
      create: { ...c, isDefault: true },
    });
  }

  const count = await prisma.category.count();
  console.log(`Seed complete: ${count} categories, settings ready.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
