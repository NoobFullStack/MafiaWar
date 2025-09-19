-- CreateTable
CREATE TABLE "Jail" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "jailUntil" TIMESTAMP(3),
    "jailCrime" TEXT NOT NULL,
    "jailSeverity" INTEGER NOT NULL,
    "jailBribeAmount" INTEGER NOT NULL,
    "jailTimeMinutes" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "jailedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "releaseReason" TEXT,
    "releaseCooldownUntil" TIMESTAMP(3),

    CONSTRAINT "Jail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Jail_characterId_isActive_idx" ON "Jail"("characterId", "isActive");

-- CreateIndex
CREATE INDEX "Jail_releaseCooldownUntil_idx" ON "Jail"("releaseCooldownUntil");

-- AddForeignKey
ALTER TABLE "Jail" ADD CONSTRAINT "Jail_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing jail data from Character table to new Jail table
-- First, create active jail records for characters that are currently in jail
INSERT INTO "Jail" (
    "id", 
    "characterId", 
    "jailUntil", 
    "jailCrime", 
    "jailSeverity", 
    "jailBribeAmount", 
    "jailTimeMinutes",
    "isActive",
    "jailedAt"
)
SELECT 
    gen_random_uuid(),
    "id" as "characterId",
    "jailUntil",
    COALESCE("jailCrime", 'Unknown Crime') as "jailCrime",
    "jailSeverity",
    COALESCE("jailBribeAmount", 1000) as "jailBribeAmount",
    -- Estimate jail time based on remaining time (rough approximation)
    CASE 
        WHEN "jailUntil" IS NOT NULL AND "jailUntil" > CURRENT_TIMESTAMP 
        THEN CEIL(EXTRACT(EPOCH FROM ("jailUntil" - CURRENT_TIMESTAMP)) / 60)::INTEGER
        ELSE 60 
    END as "jailTimeMinutes",
    ("jailUntil" IS NOT NULL AND "jailUntil" > CURRENT_TIMESTAMP) as "isActive",
    -- Estimate when they were jailed (subtract estimated jail time from release time)
    CASE 
        WHEN "jailUntil" IS NOT NULL 
        THEN "jailUntil" - INTERVAL '1 hour'
        ELSE CURRENT_TIMESTAMP 
    END as "jailedAt"
FROM "Character" 
WHERE "jailUntil" IS NOT NULL OR "jailCrime" IS NOT NULL OR "jailSeverity" > 0;

-- Update any active jail records to set releasedAt and releaseReason for expired sentences
UPDATE "Jail" 
SET 
    "isActive" = false,
    "releasedAt" = "jailUntil",
    "releaseReason" = 'time_served'
WHERE "jailUntil" IS NOT NULL AND "jailUntil" <= CURRENT_TIMESTAMP AND "isActive" = true;