-- CreateTable
CREATE TABLE "RouletteAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "betType" TEXT NOT NULL,
    "betNumber" TEXT,
    "betAmount" INTEGER NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "spinNumber" TEXT NOT NULL,
    "spinColor" TEXT NOT NULL,
    "isWin" BOOLEAN NOT NULL,
    "payout" INTEGER NOT NULL,
    "profit" INTEGER NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RouletteAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
