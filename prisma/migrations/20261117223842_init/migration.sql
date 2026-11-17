-- CreateTable
CREATE TABLE "Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expenseGroup" TEXT,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "monthlyBudget" REAL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "description" TEXT,
    "date" DATETIME NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecurringItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "cycle" TEXT NOT NULL,
    "nextDueDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "categoryId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecurringItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockHolding" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ticker" TEXT NOT NULL,
    "companyName" TEXT,
    "shares" REAL NOT NULL,
    "avgCostBasis" REAL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StockPriceCache" (
    "ticker" TEXT NOT NULL PRIMARY KEY,
    "closingPrice" REAL NOT NULL,
    "previousClose" REAL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
    "usdToBaseFx" REAL NOT NULL DEFAULT 1.0
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "StockHolding_ticker_key" ON "StockHolding"("ticker");
