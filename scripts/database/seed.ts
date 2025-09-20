#!/usr/bin/env ts-node

/**
 * Command-line seeding script for MafiaWar game data
 * Usage: yarn seed [options]
 */

import { PrismaClient } from "@prisma/client";
import { GameSeeder } from "../src/utils/GameSeeder";
import { logger } from "../src/utils/ResponseUtil";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const seeder = new GameSeeder(prisma);

  try {
    if (args.includes("--help") || args.includes("-h")) {
      console.log(`
🌱 MafiaWar Game Data Seeder

Usage:
  yarn seed                    # Seed all data (items + crimes)
  yarn seed --items            # Seed only items
  yarn seed --crimes           # Seed only crimes
  yarn seed --new              # Seed only new items (skip existing)
  yarn seed --validate         # Validate existing data
  yarn seed --stats            # Show seeding statistics
  yarn seed --help             # Show this help

Examples:
  yarn seed                    # Full seeding
  yarn seed --items            # Items only
  yarn seed --new              # Add new items without updating existing
      `);
      return;
    }

    logger.info("🎮 MafiaWar Game Data Seeder starting...");

    if (args.includes("--items")) {
      const result = await seeder.seedItems();
      logger.info(
        `✅ Items seeding complete: ${result.created} created, ${result.updated} updated`
      );
    } else if (args.includes("--crimes")) {
      const result = await seeder.seedCrimes();
      logger.info(
        `✅ Crimes seeding complete: ${result.created} created, ${result.updated} updated`
      );
    } else if (args.includes("--new")) {
      const result = await seeder.seedNewItems();
      logger.info(
        `✅ New items seeding complete: ${result.created} created, ${result.skipped} skipped`
      );
    } else if (args.includes("--validate")) {
      const validation = await seeder.validateSeeding();
      if (validation.valid) {
        logger.info("✅ Data validation passed");
      } else {
        logger.error("❌ Data validation failed:", validation.issues);
        process.exit(1);
      }
    } else if (args.includes("--stats")) {
      await seeder.getStats();
    } else {
      // Default: seed all
      const result = await seeder.seedAll();
      logger.info(`
🎉 Full seeding complete!

📊 Results:
   Items: ${result.items.created} created, ${result.items.updated} updated
   Crimes: ${result.crimes.created} created, ${result.crimes.updated} updated
   Total: ${result.total.created} created, ${result.total.updated} updated

✅ Your game is ready with ${
        result.total.created + result.total.updated
      } data entries!
      `);

      // Auto-validate after full seeding
      await seeder.validateSeeding();
    }
  } catch (error) {
    logger.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

main();
