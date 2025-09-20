/**
 * FIX CHARACTER LEVELS SCRIPT
 * 
 * This script fixes the character level bug where players had XP for higher levels
 * but their level field in the database was not updated properly.
 * 
 * It calculates the correct level for each character based on their current XP
 * and updates the database accordingly.
 */

import { LevelCalculator } from "../src/config/economy";
import DatabaseManager from "../src/utils/DatabaseManager";
import { logger } from "../src/utils/ResponseUtil";

interface CharacterLevelFix {
  id: string;
  discordId: string;
  currentLevel: number;
  correctLevel: number;
  experience: number;
  needsUpdate: boolean;
}

async function analyzeCharacterLevels(): Promise<CharacterLevelFix[]> {
  const db = DatabaseManager.getClient();
  
  // Get all characters with their current XP and levels
  const characters = await db.character.findMany({
    select: {
      id: true,
      level: true,
      experience: true,
      user: {
        select: {
          discordId: true
        }
      }
    }
  });

  const fixes: CharacterLevelFix[] = [];

  for (const character of characters) {
    const correctLevel = LevelCalculator.getLevelFromXP(character.experience);
    const needsUpdate = character.level !== correctLevel;

    fixes.push({
      id: character.id,
      discordId: character.user.discordId,
      currentLevel: character.level,
      correctLevel,
      experience: character.experience,
      needsUpdate
    });
  }

  return fixes;
}

async function fixCharacterLevels(dryRun: boolean = true): Promise<void> {
  try {
    await DatabaseManager.connect();
    logger.info("🔍 Analyzing character levels...");

    const fixes = await analyzeCharacterLevels();
    const charactersNeedingFix = fixes.filter(fix => fix.needsUpdate);

    logger.info(`📊 Analysis Complete:`);
    logger.info(`   Total Characters: ${fixes.length}`);
    logger.info(`   Need Level Fix: ${charactersNeedingFix.length}`);
    logger.info(`   Already Correct: ${fixes.length - charactersNeedingFix.length}`);

    if (charactersNeedingFix.length === 0) {
      logger.info("✅ All character levels are already correct!");
      return;
    }

    // Show detailed breakdown
    logger.info("\n📋 Characters needing level updates:");
    charactersNeedingFix.forEach(fix => {
      logger.info(`   ${fix.discordId}: Level ${fix.currentLevel} → ${fix.correctLevel} (XP: ${fix.experience})`);
    });

    if (dryRun) {
      logger.info("\n🏃 DRY RUN MODE - No changes made");
      logger.info("To apply fixes, run: yarn tsx src/scripts/database/fixCharacterLevels.ts --apply");
      return;
    }

    // Apply fixes
    logger.info("\n🔧 Applying level fixes...");
    const db = DatabaseManager.getClient();

    let successCount = 0;
    let errorCount = 0;

    for (const fix of charactersNeedingFix) {
      try {
        await db.character.update({
          where: { id: fix.id },
          data: { level: fix.correctLevel }
        });
        
        logger.info(`✅ Updated ${fix.discordId}: Level ${fix.currentLevel} → ${fix.correctLevel}`);
        successCount++;
      } catch (error) {
        logger.error(`❌ Failed to update ${fix.discordId}:`, error);
        errorCount++;
      }
    }

    logger.info(`\n📈 Fix Results:`);
    logger.info(`   Successfully Updated: ${successCount}`);
    logger.info(`   Errors: ${errorCount}`);
    logger.info(`   Total Processed: ${successCount + errorCount}`);

    if (errorCount === 0) {
      logger.info("🎉 All character levels have been fixed successfully!");
    } else {
      logger.warn("⚠️ Some updates failed. Check the errors above.");
    }

  } catch (error) {
    logger.error("💥 Fatal error during character level fix:", error);
  } finally {
    await DatabaseManager.disconnect();
  }
}

// Check if running as script
if (require.main === module) {
  const args = process.argv.slice(2);
  const shouldApply = args.includes('--apply');
  
  if (shouldApply) {
    logger.info("🚀 Starting character level fix (APPLYING CHANGES)...");
  } else {
    logger.info("🔍 Starting character level analysis (DRY RUN)...");
  }
  
  fixCharacterLevels(!shouldApply);
}

export { fixCharacterLevels, analyzeCharacterLevels };