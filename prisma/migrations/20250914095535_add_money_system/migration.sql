-- AlterTable
ALTER TABLE "public"."Character" ADD COLUMN     "bankAccessLevel" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "bankBalance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bankInterestAccrued" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "cashOnHand" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cryptoWallet" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "lastBankVisit" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."CryptoPrice" (
    "id" TEXT NOT NULL,
    "coinType" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "change24h" DOUBLE PRECISION NOT NULL,
    "change7d" DOUBLE PRECISION NOT NULL,
    "marketCap" DOUBLE PRECISION NOT NULL,
    "volume24h" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CryptoPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MoneyEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "percentage" DOUBLE PRECISION,
    "moneyType" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "duration" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoneyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BankTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "fee" INTEGER NOT NULL DEFAULT 0,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "description" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CryptoTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coinType" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "pricePerCoin" DOUBLE PRECISION NOT NULL,
    "totalValue" INTEGER NOT NULL,
    "fee" INTEGER NOT NULL DEFAULT 0,
    "fromCurrency" TEXT,
    "toCurrency" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CryptoTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MoneyEventHistory" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "affectedPlayers" INTEGER NOT NULL,
    "totalImpact" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "eventData" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoneyEventHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CryptoPrice_coinType_key" ON "public"."CryptoPrice"("coinType");

-- AddForeignKey
ALTER TABLE "public"."MoneyEvent" ADD CONSTRAINT "MoneyEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BankTransaction" ADD CONSTRAINT "BankTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CryptoTransaction" ADD CONSTRAINT "CryptoTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
