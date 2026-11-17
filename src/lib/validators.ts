import { z } from "zod";
import { CYCLES } from "./finance";

export const TX_TYPES = ["INCOME", "EXPENSE"] as const;
export const EXPENSE_GROUPS = ["FIXED", "VARIABLE"] as const;
export const CURRENCIES = ["USD", "NGN", "EUR", "GBP", "CAD"] as const;

/** Accepts "yyyy-MM-dd", a full ISO string, or a Date; normalized later via toStoredDate. */
const dateInput = z.union([
  z
    .string()
    .trim()
    .refine((s) => /^\d{4}-\d{2}-\d{2}/.test(s) && !Number.isNaN(Date.parse(s.slice(0, 10))), {
      message: "Invalid date",
    }),
  z.date(),
]);

const positiveAmount = z.coerce
  .number({ error: "Amount is required" })
  .refine((n) => Number.isFinite(n) && n > 0, { message: "Must be greater than 0" });

export const TransactionInput = z.object({
  type: z.enum(TX_TYPES),
  amount: positiveAmount,
  categoryId: z.coerce.number().int().positive({ message: "Pick a category" }),
  date: dateInput,
  description: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((s) => (s ? s : null)),
});
export type TransactionInput = z.infer<typeof TransactionInput>;
export const TransactionPatch = TransactionInput.partial();

export const RecurringItemInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  amount: positiveAmount,
  cycle: z.enum(CYCLES),
  nextDueDate: dateInput,
  categoryId: z.coerce.number().int().positive({ message: "Pick a category" }),
  isActive: z.boolean().default(true),
});
export type RecurringItemInput = z.infer<typeof RecurringItemInput>;
// No default for isActive on PATCH: an omitted field must leave it unchanged.
export const RecurringItemPatch = RecurringItemInput.extend({ isActive: z.boolean() }).partial();

export const StockHoldingInput = z.object({
  ticker: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "Ticker is required")
    .max(15, "Invalid or unsupported ticker symbol"),
  shares: z.coerce
    .number()
    .refine((n) => Number.isFinite(n) && n > 0, { message: "Shares must be greater than 0" })
    .transform((n) => Math.round(n * 1e6) / 1e6),
  avgCostBasis: z
    .union([z.number().positive("Cost basis must be greater than 0"), z.null()])
    .optional(),
});
export type StockHoldingInput = z.infer<typeof StockHoldingInput>;
export const StockHoldingPatch = StockHoldingInput.omit({ ticker: true }).partial();

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #64748b");

export const CategoryInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
  type: z.enum(TX_TYPES),
  expenseGroup: z.enum(EXPENSE_GROUPS).nullish(),
  color: hexColor.default("#64748b"),
  monthlyBudget: z.union([z.number().positive("Budget must be greater than 0"), z.null()]).optional(),
});
export type CategoryInput = z.infer<typeof CategoryInput>;
export const CategoryPatch = CategoryInput.partial();

export const SettingsPatch = z.object({
  baseCurrency: z.enum(CURRENCIES).optional(),
  usdToBaseFx: z.coerce
    .number()
    .refine((n) => Number.isFinite(n) && n > 0, { message: "FX rate must be greater than 0" })
    .optional(),
});
