#!/usr/bin/env ts-node

/**
 * Complete Force Migration Script
 * Replaces ALL SQLite data with authoritative Supabase data
 * Use this for a full production migration
 */

import { PrismaClient } from "@prisma/client";
import { logger } from "../src/utils/ResponseUtil";
import { Client } from 'pg';

async function completeForceMigration() {
  logger.info("🔄 Starting COMPLETE FORCE migration");
  logger.info("⚠️  WARNING: This will REPLACE ALL SQLite data with Supabase data!");
  logger.info("📋 Recommended: Backup your SQLite database first");

  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  const targetUrl = process.env.DATABASE_URL;

  if (!sourceUrl || !targetUrl) {
    logger.error("❌ Database URLs not found in environment");
    return;
  }

  const sourceClient = new Client({ connectionString: sourceUrl });
  const targetPrisma = new PrismaClient({ datasources: { db: { url: targetUrl } } });

  try {
    await sourceClient.connect();
    await targetPrisma.$connect();
    logger.info("✅ Connected to both databases");

    // Get stats before migration
    const beforeStats = {
      users: await targetPrisma.user.count(),
      characters: await targetPrisma.character.count(),
      assets: await targetPrisma.asset.count(),
    };

    logger.info("📊 Before migration (SQLite):");
    logger.info(`   Users: ${beforeStats.users}`);
    logger.info(`   Characters: ${beforeStats.characters}`);
    logger.info(`   Assets: ${beforeStats.assets}`);

    // WARNING: Clear ALL data first (except for relationship dependencies)
    logger.info("🧹 CLEARING all SQLite data...");
    
    // Clear in dependency order
    await targetPrisma.asset.deleteMany({});
    await targetPrisma.character.deleteMany({});
    await targetPrisma.user.deleteMany({});
    await targetPrisma.item.deleteMany({});
    await targetPrisma.actionLog.deleteMany({});
    await targetPrisma.bankTransaction.deleteMany({});
    await targetPrisma.cryptoTransaction.deleteMany({});
    await targetPrisma.gang.deleteMany({});
    await targetPrisma.gangMember.deleteMany({});
    await targetPrisma.inventory.deleteMany({});
    await targetPrisma.mission.deleteMany({});
    await targetPrisma.userMission.deleteMany({});
    await targetPrisma.leaderboard.deleteMany({});
    await targetPrisma.moneyEvent.deleteMany({});

    logger.info("✅ SQLite database cleared");

    // Now migrate everything fresh from Supabase
    logger.info("🚀 Starting fresh migration from Supabase...");

    // 1. Users
    logger.info("👤 Migrating users...");
    const usersResult = await sourceClient.query(`
      SELECT id, "discordId", username, "createdAt"
      FROM "User"
      ORDER BY "createdAt"
    `);

    for (const user of usersResult.rows) {
      await targetPrisma.user.create({
        data: {
          id: user.id,
          discordId: user.discordId,
          username: user.username,
          createdAt: user.createdAt,
        }
      });
    }
    logger.info(`✅ Migrated ${usersResult.rows.length} users`);

    // 2. Characters
    logger.info("🎭 Migrating characters...");
    const charactersResult = await sourceClient.query(`
      SELECT id, name, "userId", stats, "cashOnHand", "bankBalance", 
             "cryptoWallet", "bankAccessLevel", "lastBankVisit", 
             "bankInterestAccrued", "jailUntil", "jailCrime", 
             "jailSeverity", "jailBribeAmount", "totalJailTime",
             money, reputation, level, experience
      FROM "Character"
      ORDER BY id
    `);

    for (const char of charactersResult.rows) {
      await targetPrisma.character.create({
        data: {
          id: char.id,
          name: char.name,
          userId: char.userId,
          stats: char.stats || {},
          cashOnHand: char.cashOnHand || 0,
          bankBalance: char.bankBalance || 0,
          cryptoWallet: char.cryptoWallet || {},
          bankAccessLevel: char.bankAccessLevel || 1,
          lastBankVisit: char.lastBankVisit,
          bankInterestAccrued: char.bankInterestAccrued || 0,
          jailUntil: char.jailUntil,
          jailCrime: char.jailCrime,
          jailSeverity: char.jailSeverity || 0,
          jailBribeAmount: char.jailBribeAmount,
          totalJailTime: char.totalJailTime || 0,
          money: char.money || 0,
          reputation: char.reputation || 0,
          level: char.level || 1,
          experience: char.experience || 0,
        }
      });
    }
    logger.info(`✅ Migrated ${charactersResult.rows.length} characters`);

    // 3. Items
    logger.info("📦 Migrating items...");
    const itemsResult = await sourceClient.query(`
      SELECT id, name, type, value, description, rarity
      FROM "Item"
      ORDER BY id
    `);

    for (const item of itemsResult.rows) {
      await targetPrisma.item.create({
        data: {
          id: item.id,
          name: item.name,
          type: item.type,
          value: item.value,
          description: item.description,
          rarity: item.rarity,
        }
      });
    }
    logger.info(`✅ Migrated ${itemsResult.rows.length} items`);

    // 4. Assets
    logger.info("🏢 Migrating assets...");
    const assetsResult = await sourceClient.query(`
      SELECT id, "ownerId", type, name, level, "incomeRate", 
             "securityLevel", value, "lastIncomeTime", "isForSale"
      FROM "Asset"
      ORDER BY id
    `);

    for (const asset of assetsResult.rows) {
      await targetPrisma.asset.create({
        data: {
          id: asset.id,
          ownerId: asset.ownerId,
          type: asset.type,
          name: asset.name,
          level: asset.level,
          incomeRate: asset.incomeRate,
          securityLevel: asset.securityLevel,
          value: asset.value,
          lastIncomeTime: asset.lastIncomeTime,
          isForSale: asset.isForSale,
        }
      });
    }
    logger.info(`✅ Migrated ${assetsResult.rows.length} assets`);

    // 5. Action Logs (optional - might be large)
    logger.info("📋 Migrating action logs...");
    const actionLogsResult = await sourceClient.query(`
      SELECT id, "userId", "actionType", "actionId", result, details, timestamp
      FROM "ActionLog"
      ORDER BY timestamp DESC
      LIMIT 1000
    `);

    for (const log of actionLogsResult.rows) {
      await targetPrisma.actionLog.create({
        data: {
          id: log.id,
          userId: log.userId,
          actionType: log.actionType,
          actionId: log.actionId,
          result: log.result,
          details: log.details || {},
          timestamp: log.timestamp,
        }
      });
    }
    logger.info(`✅ Migrated ${actionLogsResult.rows.length} action logs (recent 1000)`);

    // Final stats
    const afterStats = {
      users: await targetPrisma.user.count(),
      characters: await targetPrisma.character.count(),
      assets: await targetPrisma.asset.count(),
      items: await targetPrisma.item.count(),
      actionLogs: await targetPrisma.actionLog.count(),
    };

    logger.info("📊 After migration (SQLite):");
    logger.info(`   Users: ${afterStats.users}`);
    logger.info(`   Characters: ${afterStats.characters}`);
    logger.info(`   Assets: ${afterStats.assets}`);
    logger.info(`   Items: ${afterStats.items}`);
    logger.info(`   Action Logs: ${afterStats.actionLogs}`);

    logger.info("🎉 COMPLETE FORCE migration successful!");
    logger.info("✅ SQLite database now contains authoritative Supabase data");

  } catch (error) {
    logger.error("❌ Complete force migration failed:", error);
    throw error;
  } finally {
    await sourceClient.end();
    await targetPrisma.$disconnect();
  }
}

// Run the migration
if (require.main === module) {
  completeForceMigration()
    .then(() => {
      logger.info("🎉 Complete force migration finished!");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("❌ Complete force migration failed:", error);
      process.exit(1);
    });
}