-- CreateTable
CREATE TABLE "Jail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "jailUntil" DATETIME,
    "jailCrime" TEXT NOT NULL,
    "jailSeverity" INTEGER NOT NULL,
    "jailBribeAmount" INTEGER NOT NULL,
    "jailTimeMinutes" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "jailedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" DATETIME,
    "releaseReason" TEXT,
    "releaseCooldownUntil" DATETIME,
    CONSTRAINT "Jail_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
