const currencyFormatters = new Map<string, Intl.NumberFormat>();

function currencyFormatter(currency: string, compact = false): Intl.NumberFormat {
  const key = `${currency}|${compact}`;
  let f = currencyFormatters.get(key);
  if (!f) {
    try {
      f = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        notation: compact ? "compact" : "standard",
        maximumFractionDigits: compact ? 1 : 2,
        minimumFractionDigits: compact ? 0 : 2,
      });
    } catch {
      f = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    currencyFormatters.set(key, f);
  }
  return f;
}

export function formatCurrency(
  amount: number,
  currency = "USD",
  opts: { signed?: boolean; compact?: boolean } = {},
): string {
  const formatted = currencyFormatter(currency, opts.compact).format(Math.abs(amount));
  if (amount < 0) return `-${formatted}`;
  if (opts.signed && amount > 0) return `+${formatted}`;
  return formatted;
}

export function formatPercent(value: number, opts: { signed?: boolean; digits?: number } = {}): string {
  const digits = opts.digits ?? 2;
  const abs = Math.abs(value).toFixed(digits);
  if (value < 0 && Number(abs) !== 0) return `-${abs}%`;
  if (opts.signed && value > 0 && Number(abs) !== 0) return `+${abs}%`;
  return `${abs}%`;
}

export function formatShares(shares: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(shares);
}

/** Tailwind text color for a signed number. */
export function signClass(value: number | null | undefined): string {
  if (value == null || value === 0) return "text-muted-foreground";
  return value > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
}
