# Finance Tracker

Local-first, single-user personal finance & stock portfolio tracker.

- **Transactions** — income/expense ledger with categories, filters and monthly budgets
- **Subscriptions & bills** — recurring costs normalized to a monthly burn, one-click "Log Payment"
- **Portfolio** — tickers + (fractional) shares, daily closes from Yahoo Finance cached for 12h
- **Settings** — base currency + USD FX rate, category/budget manager, CSV export

Stack: Next.js 16 (App Router) · Tailwind v4 · shadcn/ui (Base UI) · Prisma 7 + SQLite (better-sqlite3 adapter) · yahoo-finance2 v4 · recharts · zod · date-fns · vitest.

## Setup

Requires Node.js ≥ 22.

```bash
npm install                 # also runs `prisma generate`
npx prisma migrate dev      # creates prisma/dev.db
npx prisma db seed          # default categories + settings (idempotent)
npm run dev
```

`DATABASE_URL` defaults to `file:./prisma/dev.db` (override in `.env`). The database file is git-ignored.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm test` | Unit tests (finance math, date advancement, price cache & Yahoo fallback) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Production build |
| `npm run db:seed` | Re-run the seed |

## Notes

- Calendar dates (transaction dates, due dates) are stored as UTC noon of the chosen day so they never shift across timezones.
- If Yahoo Finance is unreachable or rate-limits, portfolio endpoints still return `200` with the last cached prices plus `stale: true` and a warning.
- Income/expenses/budgets are in the base currency. Stock values stay in their native currency (usually USD); the portfolio total also shows a converted figure when the base currency isn't USD and the FX rate isn't 1.
