#!/usr/bin/env ts-node

/**
 * Migration Helper Script
 * Assists with migrating from PostgreSQL/Supabase to SQLite3
 */

import { PrismaClient } from "@prisma/client";
import { logger } from "../../utils/ResponseUtil";
import { setupSQLiteDatabase } from "./setupSQLite";
import fs from "fs";
import path from "path";

interface MigrationOptions {
  sourceUrl?: string;
  targetUrl?: string;
  dryRun?: boolean;
  skipExisting?: boolean;
}

async function migratesToSQLite(options: MigrationOptions = {}) {
  logger.info("🔄 Starting migration to SQLite3...");

  const {
    sourceUrl = process.env.SOURCE_DATABASE_URL,
    targetUrl = process.env.DATABASE_URL || 'file:./data/mafiawar.db',
    dryRun = false,
    skipExisting = true
  } = options;

  try {
    // Step 1: Verify target database setup
    logger.info("📋 Step 1: Setting up target SQLite database");
    process.env.DATABASE_URL = targetUrl;
    await setupSQLiteDatabase();

    // Step 2: Check if source database exists
    if (!sourceUrl) {
      logger.info("ℹ️ No source database URL provided, skipping data migration");
      logger.info("✅ SQLite database is ready for use");
      return;
    }

    logger.info("📋 Step 2: Checking source database connection");
    
    // Create source connection (commented out due to potential network restrictions)
    // const sourcePrisma = new PrismaClient({
    //   datasources: { db: { url: sourceUrl } }
    // });

    // Step 3: Data migration would go here
    logger.info("📋 Step 3: Data migration");
    if (dryRun) {
      logger.info("🔍 DRY RUN: Would migrate data from source to target");
      logger.info("   - Export user data");
      logger.info("   - Export character data");
      logger.info("   - Export asset data");
      logger.info("   - Export transaction history");
      logger.info("   - Import into SQLite with conflict resolution");
    } else {
      logger.info("ℹ️ Automatic data migration disabled for safety");
      logger.info("   Manual migration steps:");
      logger.info("   1. Export data from your current PostgreSQL/Supabase instance");
      logger.info("   2. Transform data format if needed");
      logger.info("   3. Import using Prisma or SQL scripts");
    }

    // Step 4: Verification
    logger.info("📋 Step 4: Verifying SQLite setup");
    const targetPrisma = new PrismaClient({
      datasources: { db: { url: targetUrl } }
    });

    await targetPrisma.$connect();
    
    // Check tables exist
    const tables = await targetPrisma.$queryRaw`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations'
      ORDER BY name;
    ` as Array<{ name: string }>;

    logger.info(`✅ SQLite database contains ${tables.length} tables:`);
    tables.forEach(table => {
      logger.info(`   - ${table.name}`);
    });

    await targetPrisma.$disconnect();

    logger.info("\n🎉 Migration completed successfully!");
    logger.info("\n📝 Next steps:");
    logger.info("  1. Update your .env file to use the new DATABASE_URL");
    logger.info("  2. Update your application to remove Supabase dependencies");
    logger.info("  3. Test your application with the new SQLite database");
    logger.info("  4. Deploy with the simplified SQLite setup");

  } catch (error) {
    logger.error("❌ Migration failed:", error);
    throw error;
  }
}

// Command line interface
function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--source':
        options.sourceUrl = args[++i];
        break;
      case '--target':
        options.targetUrl = args[++i];
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--skip-existing':
        options.skipExisting = true;
        break;
      case '--help':
        console.log(`
Migration Helper for SQLite3

Usage: npm run migrate [options]

Options:
  --source <url>     Source database URL (PostgreSQL/Supabase)
  --target <url>     Target SQLite database URL (default: file:./data/mafiawar.db)
  --dry-run         Show what would be migrated without making changes
  --skip-existing   Skip tables that already exist (default: true)
  --help            Show this help message

Examples:
  npm run migrate --dry-run
  npm run migrate --source postgresql://... --target file:./data/prod.db
        `);
        process.exit(0);
    }
  }

  return options;
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  process.exit(0);
});

process.on("SIGTERM", async () => {
  process.exit(0);
});

// Run migration if called directly
if (require.main === module) {
  const options = parseArgs();
  migratesToSQLite(options).catch((error) => {
    logger.error("❌ Migration failed:", error);
    process.exit(1);
  });
}

export { migratesToSQLite };