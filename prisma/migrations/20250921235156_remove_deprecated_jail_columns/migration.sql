-- AlterTable
-- Remove deprecated jail columns from Character table
-- These have been moved to the dedicated Jail table

ALTER TABLE "Character" DROP COLUMN "jailUntil";
ALTER TABLE "Character" DROP COLUMN "jailCrime";
ALTER TABLE "Character" DROP COLUMN "jailSeverity";
ALTER TABLE "Character" DROP COLUMN "jailBribeAmount";