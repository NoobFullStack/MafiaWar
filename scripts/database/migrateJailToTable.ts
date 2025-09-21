/**
 * MIGRATION SCRIPT: Character Jail Data to Jail Table
 *
 * ⚠️  WARNING: This script references deprecated Character table jail columns
 * ⚠️  (jailUntil, jailCrime, jailSeverity, jailBribeAmount) that have been removed.
 * ⚠️  This script is kept for historical reference and should only be run
 * ⚠️  on databases that still have the deprecated columns.
 *
 * This script migrates existing jail data from the Character table to the new Jail table.
 * It preserves all existing jail information and creates proper jail records for players
 * who are currently in jail.
 *
 * Run this script after the jail table has been created via Prisma migration.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface CharacterJailData {
  id: string;
  jailUntil: Date | null;
  jailCrime: string | null;
  jailSeverity: number;
  jailBribeAmount: number | null;
}

async function migrateJailData() {
  console.log("🚀 Starting jail data migration...");

  try {
    // Get all characters with jail data
    const charactersWithJailData = (await prisma.character.findMany({
      where: {
        OR: [
          { jailUntil: { not: null } },
          { jailCrime: { not: null } },
          { jailSeverity: { gt: 0 } },
          { jailBribeAmount: { not: null } },
        ],
      },
      select: {
        id: true,
        jailUntil: true,
        jailCrime: true,
        jailSeverity: true,
        jailBribeAmount: true,
      },
    })) as CharacterJailData[];

    console.log(
      `📊 Found ${charactersWithJailData.length} characters with jail data`
    );

    if (charactersWithJailData.length === 0) {
      console.log("✅ No jail data to migrate. Migration complete!");
      return;
    }

    let migratedCount = 0;
    let activeJailCount = 0;
    let expiredJailCount = 0;

    const now = new Date();

    for (const character of charactersWithJailData) {
      try {
        // Skip if no meaningful jail data
        if (
          !character.jailUntil &&
          !character.jailCrime &&
          character.jailSeverity === 0 &&
          !character.jailBribeAmount
        ) {
          continue;
        }

        // Determine if this is an active jail sentence
        const isActive = character.jailUntil && character.jailUntil > now;
        const isExpired = character.jailUntil && character.jailUntil <= now;

        // Create jail record
        const jailData = {
          characterId: character.id,
          jailUntil: character.jailUntil,
          jailCrime: character.jailCrime || "Unknown (migrated)",
          jailSeverity: character.jailSeverity || 5,
          jailBribeAmount: character.jailBribeAmount || 5000, // Default bribe if missing
          jailTimeMinutes: character.jailUntil
            ? Math.max(
                1,
                Math.ceil(
                  (character.jailUntil.getTime() - now.getTime()) / (1000 * 60)
                )
              )
            : 60, // Estimate original time
          isActive: isActive || false,
          jailedAt: character.jailUntil
            ? new Date(character.jailUntil.getTime() - 60 * 60 * 1000) // Estimate jail start (1 hour before end)
            : new Date(now.getTime() - 24 * 60 * 60 * 1000), // Default to 24 hours ago
          releasedAt: isExpired ? character.jailUntil : null,
          releaseReason: isExpired ? "time_served" : null,
          releaseCooldownUntil: isExpired
            ? new Date(character.jailUntil!.getTime() + 15 * 60 * 1000)
            : null,
        };

        await prisma.jail.create({
          data: jailData,
        });

        migratedCount++;

        if (isActive) {
          activeJailCount++;
          console.log(
            `  ✅ Migrated active jail for character ${character.id} (${character.jailCrime})`
          );
        } else if (isExpired) {
          expiredJailCount++;
          console.log(
            `  📝 Migrated expired jail for character ${character.id} (${character.jailCrime})`
          );
        }
      } catch (error) {
        console.error(
          `❌ Failed to migrate jail data for character ${character.id}:`,
          error
        );
      }
    }

    console.log("\n📊 Migration Summary:");
    console.log(`  • Total records migrated: ${migratedCount}`);
    console.log(`  • Active jail sentences: ${activeJailCount}`);
    console.log(`  • Expired jail sentences: ${expiredJailCount}`);

    console.log(
      "\n⚠️  Note: Character table jail fields are now deprecated but preserved for safety."
    );
    console.log(
      "   After verifying the migration, you can remove them in a future migration."
    );

    console.log("\n✅ Jail data migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateJailData()
    .then(() => {
      console.log("🎉 Migration script completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Migration script failed:", error);
      process.exit(1);
    });
}

export default migrateJailData;
