# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

Next.js 16 has breaking changes compared with older versions. Before using a Next API, check the bundled docs in `node_modules/next/dist/docs/`. For example, route `params` are Promises: type handlers with the global `RouteContext<"/api/x/[id]">` and `await ctx.params`.

## Commands

```bash
npm run dev                    # dev server on http://localhost:3000
npm test                       # vitest run (all unit tests)
npx vitest run src/lib/__tests__/finance.test.ts   # one test file
npx vitest run -t "advanceDueDate"                 # tests matching a name
npm run typecheck              # tsc --noEmit (run `npx next typegen` first if RouteContext types are missing)
npm run lint                   # eslint (includes React Compiler rules)
npm run build
npx prisma migrate dev --name <change>   # after editing prisma/schema.prisma
npx prisma generate                      # migrate dev does NOT auto-generate in Prisma 7
npx prisma db seed                       # idempotent upserts
```

Node ≥ 22. npm 12 blocks install scripts by default. Native and tool packages (`better-sqlite3`, `prisma`, `@prisma/engines`, `esbuild`) are approved through the `allowScripts` field in package.json. A newly added package with an install script needs `npm install-scripts approve <pkg>`.

## Architecture

Local-first, single-user app. SQLite is accessed through Prisma 7 with the `@prisma/adapter-better-sqlite3` driver adapter.

- **Prisma 7 setup.** The connection URL lives in `prisma.config.ts` (`DATABASE_URL`, default `file:./prisma/dev.db`), not in the schema. The client is generated to `src/generated/prisma` (git-ignored) and imported as `@/generated/prisma/client`. `src/lib/db.ts` is the singleton client. `prisma/seed.ts` builds its own client the same way.
- **Data flow.** Every page in `src/app/*/page.tsx` is a client component. It reads data from the API routes in `src/app/api/**` using `useApi()` from `src/lib/client.ts`. There are no server actions and no server-side data fetching in pages. After any mutation, call `notifyDataChanged()`. This fires a window event, and every mounted `useApi` hook refetches. This is how the global "Add Transaction" modal refreshes whichever page is open.
- **Cache Components is deliberately disabled** (`next.config.ts`) so that API routes always read live data.
- **Pure logic lives in `src/lib/finance.ts`.** It has no DB or network access and is unit tested. It covers recurring-cycle normalization, due-date advancement, statuses, transaction summaries and portfolio math. API routes and the client dashboard both use it. Aggregation happens on the client: the dashboard calls the generic endpoints and computes with these helpers, and there is no dashboard endpoint.
- **Validation.** The zod schemas in `src/lib/validators.ts` are shared by forms and API routes. PATCH routes use `*Patch` schemas, which must not carry defaults: an omitted field must not overwrite a stored value. Routes also enforce rules zod can't check:
  - a transaction's category type must match the transaction type;
  - recurring items require an EXPENSE category;
  - a category in use can't be deleted (409).

  Shared route helpers are in `src/lib/api.ts`.
- **Date convention.** Calendar dates (transaction `date`, `nextDueDate`) are stored as UTC noon of the chosen day. Always go through `toStoredDate` / `dateKey` / `localDateKey` / `todayStored` in `finance.ts`. Month filters use `monthRange("yyyy-MM")`. In the UI, render stored dates with `formatTxDate` and never with `new Date(iso)` formatted locally.
- **Stock prices (`src/lib/stocks.ts`, server-only).**
  - Uses `yahoo-finance2` v4 (`new YahooFinance()`), called with `validateResult: false`.
  - `StockPriceCache` rows count as stale after 12h.
  - `getPortfolio({ sync: "auto" | "force" | "none" })` is the single loader shared by GET `/api/portfolio`, POST `/refresh` and the CSV export.
  - Provider failures must never fail the request. The cached prices are returned with `stale: true` and `warning`.
  - When adding a holding, `lookupTicker` tells an invalid ticker (400) apart from a provider outage (503).
- **Currency.** Income, expenses and budgets are in `AppSettings.baseCurrency`. Stock values stay in their native currency (usually USD). `convertUsdToBase` returns a converted total only when the base currency isn't USD and `usdToBaseFx !== 1`. The client reads settings through `useApp().settings` (`src/components/layout/QuickAddTrigger.tsx`, which also hosts the global transaction modal).

## UI conventions

- **shadcn/ui uses the `base-nova` style, built on Base UI, not Radix.** Compose with the `render` prop instead of `asChild`. For links rendered as buttons, use `<Button render={<Link …/>} nativeButton={false}>`. For simple selects, use `SimpleSelect` (`src/components/shared/SimpleSelect.tsx`): Base UI Select needs an `items` map to show labels.
- **Modals** wrap an inner form component, keyed by record id, that initializes state from props. The form remounts on each open, which avoids resetting state in effects. The lint rule `react-hooks/set-state-in-effect` is enforced.
- **Charts** use the validated categorical palette defined as `--series-1..8` / `--series-other` in `globals.css`, with separate light and dark values. Donuts go through `src/components/shared/DonutChart.tsx`, which always renders a labelled legend with values. Status colors (red/amber) are always paired with an icon and a text label.
