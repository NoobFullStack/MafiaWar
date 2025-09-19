#!/usr/bin/env ts-node

/**
 * SQLite Migration Setup Script
 * Initializes SQLite database and applies schema
 */

import { PrismaClient } from "@prisma/client";
import { logger } from "../../utils/ResponseUtil";
import { initializeGameData } from "../../utils/GameSeeder";
import fs from "fs";
import path from "path";

async function setupSQLiteDatabase() {
  logger.info("🔄 Setting up SQLite database for MafiaWar...");

  // Ensure data directory exists
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    logger.info("📁 Created data directory");
  }

  // Set up database URL for SQLite
  const databaseUrl = process.env.DATABASE_URL || 'file:./data/mafiawar.db';
  process.env.DATABASE_URL = databaseUrl;

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  try {
    // Test connection
    await prisma.$connect();
    logger.info("✅ Connected to SQLite database");

    // Check if tables exist
    const tables = await prisma.$queryRaw`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations'
      ORDER BY name;
    ` as Array<{ name: string }>;

    if (tables.length === 0) {
      logger.info("🌱 Database is empty, initializing with game data...");
      await initializeGameData(prisma);
      logger.info("✅ Game data initialized successfully");
    } else {
      logger.info(`✅ Database already contains ${tables.length} tables`);
      tables.forEach(table => {
        logger.info(`   - ${table.name}`);
      });
    }

    // Verify schema integrity
    const userCount = await prisma.user.count();
    const characterCount = await prisma.character.count();
    
    logger.info("📊 Database Statistics:");
    logger.info(`   Users: ${userCount}`);
    logger.info(`   Characters: ${characterCount}`);

    logger.info("🎉 SQLite database setup completed successfully!");

  } catch (error) {
    logger.error("❌ Error setting up SQLite database:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  process.exit(0);
});

process.on("SIGTERM", async () => {
  process.exit(0);
});

// Run setup if called directly
if (require.main === module) {
  setupSQLiteDatabase().catch((error) => {
    logger.error("❌ Setup failed:", error);
    process.exit(1);
  });
}

export { setupSQLiteDatabase };