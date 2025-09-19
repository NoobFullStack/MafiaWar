/**
 * CLEANUP SCRIPT: Remove deprecated jail fields from Character table
 * 
 * This script should be run AFTER the jail system refactor has been deployed
 * and confirmed working properly. It removes the deprecated jail fields from
 * the Character table since they are now stored in the Jail table.
 * 
 * WARNING: This is a destructive operation. Make sure to backup your database
 * before running this script.
 */

import { PrismaClient } from "@prisma/client";
import { logger } from "../../utils/ResponseUtil";

const prisma = new PrismaClient();

async function cleanupDeprecatedJailFields() {
  try {
    logger.info("🧹 Starting cleanup of deprecated jail fields from Character table...");

    // Verify that the new Jail table exists and has data
    const jailCount = await prisma.jail.count();
    logger.info(`Found ${jailCount} records in Jail table`);

    if (jailCount === 0) {
      logger.warn("⚠️  Warning: No records found in Jail table. Aborting cleanup.");
      logger.warn("   Please ensure the migration has run successfully before cleaning up.");
      return;
    }

    // Check for any characters that still have active jail data in the old fields
    const charactersWithOldJailData = await prisma.character.count({
      where: {
        OR: [
          { jailUntil: { not: null } },
          { jailCrime: { not: null } },
          { jailSeverity: { gt: 0 } },
          { jailBribeAmount: { not: null } }
        ]
      }
    });

    logger.info(`Found ${charactersWithOldJailData} characters with old jail data`);

    if (charactersWithOldJailData > 0) {
      logger.warn("⚠️  Warning: Some characters still have jail data in old fields.");
      logger.warn("   This suggests the migration may not have completed properly.");
      logger.warn("   Please verify migration before proceeding with cleanup.");
      
      // Show some examples of characters with old data
      const examples = await prisma.character.findMany({
        where: {
          OR: [
            { jailUntil: { not: null } },
            { jailCrime: { not: null } },
            { jailSeverity: { gt: 0 } },
            { jailBribeAmount: { not: null } }
          ]
        },
        take: 5,
        select: {
          id: true,
          jailUntil: true,
          jailCrime: true,
          jailSeverity: true,
          jailBribeAmount: true
        }
      });

      logger.info("Examples of characters with old jail data:");
      examples.forEach((char, index) => {
        logger.info(`  ${index + 1}. Character ${char.id}: jailUntil=${char.jailUntil}, crime=${char.jailCrime}, severity=${char.jailSeverity}, bribe=${char.jailBribeAmount}`);
      });

      // Ask for confirmation before proceeding
      logger.warn("🚨 Proceeding with cleanup will remove this data permanently!");
      logger.warn("   Type 'yes' to continue or 'no' to abort:");
      
      // Since we can't get user input in this environment, we'll abort for safety
      logger.error("❌ Cleanup aborted for safety. Please verify migration completion first.");
      return;
    }

    logger.info("✅ Migration verification passed. Proceeding with cleanup...");

    // Create the cleanup migration SQL
    const cleanupSQL = `
-- Remove deprecated jail fields from Character table
-- These fields have been moved to the Jail table

ALTER TABLE "Character" DROP COLUMN IF EXISTS "jailUntil";
ALTER TABLE "Character" DROP COLUMN IF EXISTS "jailCrime";
ALTER TABLE "Character" DROP COLUMN IF EXISTS "jailSeverity";
ALTER TABLE "Character" DROP COLUMN IF EXISTS "jailBribeAmount";

-- Note: totalJailTime is kept as it's still used for statistics
`;

    logger.info("SQL to be executed:");
    logger.info(cleanupSQL);

    // Execute the cleanup
    await prisma.$executeRawUnsafe(`ALTER TABLE "Character" DROP COLUMN IF EXISTS "jailUntil"`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Character" DROP COLUMN IF EXISTS "jailCrime"`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Character" DROP COLUMN IF EXISTS "jailSeverity"`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Character" DROP COLUMN IF EXISTS "jailBribeAmount"`);

    logger.info("✅ Cleanup completed successfully!");
    logger.info("   Deprecated jail fields have been removed from Character table");
    logger.info("   The totalJailTime field has been kept for statistics");

    // Verify cleanup
    const finalCount = await prisma.jail.count();
    logger.info(`Final verification: ${finalCount} records in Jail table`);

  } catch (error) {
    logger.error("❌ Cleanup failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Only run if called directly
if (require.main === module) {
  cleanupDeprecatedJailFields()
    .then(() => {
      logger.info("🎉 Jail system cleanup completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("💥 Jail system cleanup failed:", error);
      process.exit(1);
    });
}