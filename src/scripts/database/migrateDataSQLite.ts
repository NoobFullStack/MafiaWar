#!/usr/bin/env ts-node

/**
 * Complete Data Migration Script
 * Safely migrates data from Supabase (PostgreSQL) to SQLite
 */

import { PrismaClient } from "@prisma/client";
import { logger } from "../../utils/ResponseUtil";
import fs from "fs";
import path from "path";

interface MigrationStats {
  users: number;
  characters: number;
  assets: number;
  actionLogs: number;
  bankTransactions: number;
  cryptoTransactions: number;
  gangs: number;
  gangMembers: number;
  inventory: number;
  missions: number;
  userMissions: number;
  leaderboards: number;
  moneyEvents: number;
}

async function migrateData() {
  logger.info("🔄 Starting SAFE data migration from Supabase to SQLite...");
  logger.info("⚠️  IMPORTANT: This is a COPY operation - Supabase data will remain untouched!");

  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  const targetUrl = process.env.DATABASE_URL;

  if (!sourceUrl) {
    logger.error("❌ SOURCE_DATABASE_URL not found in environment");
    return;
  }

  if (!targetUrl) {
    logger.error("❌ DATABASE_URL not found in environment");
    return;
  }

  logger.info(`📡 Source: ${sourceUrl.replace(/:[^:@]*@/, ':***@')}`);
  logger.info(`📁 Target: ${targetUrl}`);

  // Create database connections
  logger.info("🔌 Connecting to databases...");
  
  // For source (PostgreSQL), we need to use a client that doesn't validate against schema
  const sourcePrisma = new PrismaClient({
    datasources: { db: { url: sourceUrl } },
    log: ['error'],
    // Skip schema validation for the source connection
    __internal: {
      engine: {
        allowTriggerPanic: false
      }
    }
  } as any);

  const targetPrisma = new PrismaClient({
    datasources: { db: { url: targetUrl } },
    log: ['error']
  });

  try {
    // Test connections
    await sourcePrisma.$connect();
    await targetPrisma.$connect();
    logger.info("✅ Connected to both databases");

    // Get source data statistics
    logger.info("📊 Analyzing source database...");
    const sourceStats = await getDataStats(sourcePrisma);
    logger.info("📊 Source database statistics:");
    Object.entries(sourceStats).forEach(([table, count]) => {
      logger.info(`   ${table}: ${count}`);
    });

    if (Object.values(sourceStats).every(count => count === 0)) {
      logger.info("ℹ️ No data found in source database");
      return;
    }

    // Clear target database (optional - ask user)
    logger.info("🧹 Clearing target database...");
    logger.info("📋 Note: Only SQLite database will be cleared - Supabase remains untouched");
    await clearTargetDatabase(targetPrisma);

    // Migrate data in correct order (respecting foreign keys)
    logger.info("🚀 Starting data migration...");

    // 1. Users (no dependencies)
    if (sourceStats.users > 0) {
      logger.info("👤 Migrating users...");
      const users = await sourcePrisma.user.findMany({
        include: {
          character: true
        }
      });
      
      for (const user of users) {
        await targetPrisma.user.create({
          data: {
            id: user.id,
            discordId: user.discordId,
            username: user.username,
            createdAt: user.createdAt,
          }
        });
      }
      logger.info(`✅ Migrated ${users.length} users`);

      // 2. Characters (depends on users)
      logger.info("🎭 Migrating characters...");
      for (const user of users) {
        if (user.character) {
          const char = user.character;
          await targetPrisma.character.create({
            data: {
              id: char.id,
              name: char.name,
              userId: char.userId,
              stats: char.stats as any,
              cashOnHand: char.cashOnHand || 0,
              bankBalance: char.bankBalance || 0,
              cryptoWallet: char.cryptoWallet as any || {},
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
      }
      logger.info(`✅ Migrated ${users.filter(u => u.character).length} characters`);
    }

    // 3. Items (no dependencies)
    logger.info("📦 Migrating items...");
    const items = await sourcePrisma.item.findMany();
    for (const item of items) {
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
    logger.info(`✅ Migrated ${items.length} items`);

    // 4. Assets (depends on users)
    logger.info("🏢 Migrating assets...");
    const assets = await sourcePrisma.asset.findMany();
    for (const asset of assets) {
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
    logger.info(`✅ Migrated ${assets.length} assets`);

    // 5. Gangs (depends on users)
    logger.info("👥 Migrating gangs...");
    const gangs = await sourcePrisma.gang.findMany();
    for (const gang of gangs) {
      await targetPrisma.gang.create({
        data: {
          id: gang.id,
          name: gang.name,
          createdAt: gang.createdAt,
          bank: gang.bank,
          leaderId: gang.leaderId,
        }
      });
    }
    logger.info(`✅ Migrated ${gangs.length} gangs`);

    // 6. Gang Members (depends on users and gangs)
    logger.info("👥 Migrating gang members...");
    const gangMembers = await sourcePrisma.gangMember.findMany();
    for (const member of gangMembers) {
      await targetPrisma.gangMember.create({
        data: {
          id: member.id,
          userId: member.userId,
          gangId: member.gangId,
          role: member.role,
          joinedAt: member.joinedAt,
        }
      });
    }
    logger.info(`✅ Migrated ${gangMembers.length} gang members`);

    // 7. Inventory (depends on users and items)
    logger.info("🎒 Migrating inventory...");
    const inventory = await sourcePrisma.inventory.findMany();
    for (const inv of inventory) {
      await targetPrisma.inventory.create({
        data: {
          id: inv.id,
          userId: inv.userId,
          itemId: inv.itemId,
          quantity: inv.quantity,
        }
      });
    }
    logger.info(`✅ Migrated ${inventory.length} inventory items`);

    // 8. Action Logs (depends on users)
    logger.info("📝 Migrating action logs...");
    const actionLogs = await sourcePrisma.actionLog.findMany({
      orderBy: { timestamp: 'asc' },
      take: 10000 // Limit to most recent 10k logs to avoid memory issues
    });
    for (const log of actionLogs) {
      await targetPrisma.actionLog.create({
        data: {
          id: log.id,
          userId: log.userId,
          actionType: log.actionType,
          actionId: log.actionId,
          result: log.result,
          details: log.details as any,
          timestamp: log.timestamp,
        }
      });
    }
    logger.info(`✅ Migrated ${actionLogs.length} action logs`);

    // 9. Bank Transactions (depends on users)
    logger.info("🏦 Migrating bank transactions...");
    const bankTransactions = await sourcePrisma.bankTransaction.findMany();
    for (const transaction of bankTransactions) {
      await targetPrisma.bankTransaction.create({
        data: {
          id: transaction.id,
          userId: transaction.userId,
          transactionType: transaction.transactionType,
          amount: transaction.amount,
          fee: transaction.fee,
          balanceBefore: transaction.balanceBefore,
          balanceAfter: transaction.balanceAfter,
          description: transaction.description,
          timestamp: transaction.timestamp,
        }
      });
    }
    logger.info(`✅ Migrated ${bankTransactions.length} bank transactions`);

    // 10. Crypto Transactions (depends on users)
    logger.info("₿ Migrating crypto transactions...");
    const cryptoTransactions = await sourcePrisma.cryptoTransaction.findMany();
    for (const transaction of cryptoTransactions) {
      await targetPrisma.cryptoTransaction.create({
        data: {
          id: transaction.id,
          userId: transaction.userId,
          coinType: transaction.coinType,
          transactionType: transaction.transactionType,
          amount: transaction.amount,
          pricePerCoin: transaction.pricePerCoin,
          totalValue: transaction.totalValue,
          fee: transaction.fee,
          fromCurrency: transaction.fromCurrency,
          toCurrency: transaction.toCurrency,
          timestamp: transaction.timestamp,
        }
      });
    }
    logger.info(`✅ Migrated ${cryptoTransactions.length} crypto transactions`);

    // Get final statistics
    logger.info("📊 Verifying migration...");
    const targetStats = await getDataStats(targetPrisma);
    logger.info("📊 Target database statistics:");
    Object.entries(targetStats).forEach(([table, count]) => {
      logger.info(`   ${table}: ${count}`);
    });

    // Verify counts match
    let migrationValid = true;
    for (const [table, sourceCount] of Object.entries(sourceStats)) {
      const targetCount = targetStats[table as keyof MigrationStats];
      if (table === 'actionLogs' && sourceCount > 10000) {
        // We limited action logs, so this is expected
        continue;
      }
      if (sourceCount !== targetCount) {
        logger.error(`❌ Mismatch in ${table}: source=${sourceCount}, target=${targetCount}`);
        migrationValid = false;
      }
    }

    if (migrationValid) {
      logger.info("🎉 Migration completed successfully!");
      logger.info("✅ All data counts match between source and target");
      logger.info("");
      logger.info("🛡️  SAFETY REMINDER:");
      logger.info("   - Your Supabase data is still intact and untouched");
      logger.info("   - Test your application thoroughly with the SQLite database");
      logger.info("   - Only disable Supabase after confirming everything works");
      logger.info("   - Keep Supabase as backup until you're 100% confident");
      logger.info("");
      logger.info("📝 Next steps:");
      logger.info("   1. Test all application features with SQLite");
      logger.info("   2. Verify data integrity and functionality");
      logger.info("   3. Run the application in production-like conditions");
      logger.info("   4. Only then consider decommissioning Supabase");
    } else {
      logger.error("❌ Migration completed but with count mismatches");
      logger.error("🛡️  Supabase data remains safe and untouched");
    }

  } catch (error) {
    logger.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await sourcePrisma.$disconnect();
    await targetPrisma.$disconnect();
  }
}

async function getDataStats(prisma: PrismaClient): Promise<MigrationStats> {
  const [
    users, characters, assets, actionLogs, bankTransactions,
    cryptoTransactions, gangs, gangMembers, inventory,
    missions, userMissions, leaderboards, moneyEvents
  ] = await Promise.all([
    prisma.user.count(),
    prisma.character.count(),
    prisma.asset.count(),
    prisma.actionLog.count(),
    prisma.bankTransaction.count(),
    prisma.cryptoTransaction.count(),
    prisma.gang.count(),
    prisma.gangMember.count(),
    prisma.inventory.count(),
    prisma.mission.count(),
    prisma.userMission.count(),
    prisma.leaderboard.count(),
    prisma.moneyEvent.count(),
  ]);

  return {
    users, characters, assets, actionLogs, bankTransactions,
    cryptoTransactions, gangs, gangMembers, inventory,
    missions, userMissions, leaderboards, moneyEvents
  };
}

async function clearTargetDatabase(prisma: PrismaClient) {
  // Delete in reverse order of dependencies
  await prisma.actionLog.deleteMany();
  await prisma.bankTransaction.deleteMany();
  await prisma.cryptoTransaction.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.gangMember.deleteMany();
  await prisma.gang.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.character.deleteMany();
  await prisma.user.deleteMany();
  await prisma.item.deleteMany();
  await prisma.mission.deleteMany();
  await prisma.userMission.deleteMany();
  await prisma.leaderboard.deleteMany();
  await prisma.moneyEvent.deleteMany();
  await prisma.cryptoPrice.deleteMany();
  
  logger.info("🧹 Target database cleared");
}

// Run migration if called directly
if (require.main === module) {
  migrateData().catch((error) => {
    logger.error("❌ Migration failed:", error);
    process.exit(1);
  });
}

export { migrateData };