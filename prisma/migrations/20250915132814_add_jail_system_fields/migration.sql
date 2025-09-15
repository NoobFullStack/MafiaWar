-- AlterTable
ALTER TABLE "public"."Character" ADD COLUMN     "jailCrime" TEXT,
ADD COLUMN     "jailSeverity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jailUntil" TIMESTAMP(3),
ADD COLUMN     "totalJailTime" INTEGER NOT NULL DEFAULT 0;
