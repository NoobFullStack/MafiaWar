#!/usr/bin/env ts-node

/**
 * Simple Data Migration Script
 * Exports data from Supabase and imports to SQLite
 */

import { PrismaClient } from "@prisma/client";
import { logger } from "../src/utils/ResponseUtil";
import fs from "fs";
import path from "path";

async function exportAndMigrateData() {
  logger.info("🔄 Starting data export and migration...");

  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  const targetUrl = process.env.DATABASE_URL;

  if (!sourceUrl) {
    logger.error("❌ SOURCE_DATABASE_URL not found in environment");
    return;
  }

  logger.info(`📡 Source: ${sourceUrl.replace(/:[^:@]*@/, ':***@')}`);
  logger.info(`📁 Target: ${targetUrl}`);

  // Step 1: Export data using a temporary PostgreSQL connection
  logger.info("📤 Exporting data from Supabase...");
  
  const exportData = await exportDataFromSupabase(sourceUrl);
  
  if (!exportData) {
    logger.error("❌ Failed to export data from Supabase");
    return;
  }

  // Step 2: Import data to SQLite
  logger.info("📥 Importing data to SQLite...");
  await importDataToSQLite(targetUrl!, exportData);

  logger.info("🎉 Migration completed successfully!");
}

async function exportDataFromSupabase(sourceUrl: string) {
  try {
    // We'll use a manual connection approach since Prisma schema conflicts
    const { Client } = await import('pg');
    const client = new Client({
      connectionString: sourceUrl,
    });

    await client.connect();
    logger.info("✅ Connected to Supabase");

    // Export each table
    const exportData: any = {};

    // Users
    const usersResult = await client.query('SELECT * FROM "User" ORDER BY "createdAt"');
    exportData.users = usersResult.rows;
    logger.info(`📤 Exported ${usersResult.rows.length} users`);

    // Characters
    const charactersResult = await client.query('SELECT * FROM "Character"');
    exportData.characters = charactersResult.rows;
    logger.info(`📤 Exported ${charactersResult.rows.length} characters`);

    // Assets
    const assetsResult = await client.query('SELECT * FROM "Asset"');
    exportData.assets = assetsResult.rows;
    logger.info(`📤 Exported ${assetsResult.rows.length} assets`);

    // Action Logs (limit to recent 5000)
    const actionLogsResult = await client.query('SELECT * FROM "ActionLog" ORDER BY "timestamp" DESC LIMIT 5000');
    exportData.actionLogs = actionLogsResult.rows;
    logger.info(`📤 Exported ${actionLogsResult.rows.length} action logs`);

    // Bank Transactions
    const bankTransactionsResult = await client.query('SELECT * FROM "BankTransaction" ORDER BY "timestamp"');
    exportData.bankTransactions = bankTransactionsResult.rows;
    logger.info(`📤 Exported ${bankTransactionsResult.rows.length} bank transactions`);

    // Crypto Transactions
    const cryptoTransactionsResult = await client.query('SELECT * FROM "CryptoTransaction" ORDER BY "timestamp"');
    exportData.cryptoTransactions = cryptoTransactionsResult.rows;
    logger.info(`📤 Exported ${cryptoTransactionsResult.rows.length} crypto transactions`);

    // Other tables
    const tablesResult = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name NOT IN ('User', 'Character', 'Asset', 'ActionLog', 'BankTransaction', 'CryptoTransaction')
      AND table_name NOT LIKE '%migrations%'
    `);

    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      try {
        const result = await client.query(`SELECT * FROM "${tableName}"`);
        exportData[tableName.toLowerCase()] = result.rows;
        logger.info(`📤 Exported ${result.rows.length} ${tableName.toLowerCase()}`);
      } catch (error) {
        logger.warn(`⚠️ Could not export ${tableName}:`, error);
      }
    }

    await client.end();
    return exportData;

  } catch (error) {
    logger.error("❌ Failed to export from Supabase:", error);
    
    // Fallback: suggest manual export
    logger.info("💡 Alternative: Export data manually from Supabase dashboard:");
    logger.info("   1. Go to your Supabase dashboard");
    logger.info("   2. Use SQL Editor to export each table");
    logger.info("   3. Save as JSON and import manually");
    
    return null;
  }
}

async function importDataToSQLite(targetUrl: string, exportData: any) {
  const targetPrisma = new PrismaClient({
    datasources: { db: { url: targetUrl } },
    log: ['error']
  });

  try {
    await targetPrisma.$connect();
    logger.info("✅ Connected to SQLite");

    // Clear existing data
    logger.info("🧹 Clearing existing SQLite data...");
    await clearSQLiteData(targetPrisma);

    // Import users first (no dependencies)
    if (exportData.users && exportData.users.length > 0) {
      logger.info("👤 Importing users...");
      for (const user of exportData.users) {
        await targetPrisma.user.create({
          data: {
            id: user.id,
            discordId: user.discordId,
            username: user.username,
            createdAt: new Date(user.createdAt),
          }
        });
      }
      logger.info(`✅ Imported ${exportData.users.length} users`);
    }

    // Import characters
    if (exportData.characters && exportData.characters.length > 0) {
      logger.info("🎭 Importing characters...");
      for (const char of exportData.characters) {
        await targetPrisma.character.create({
          data: {
            id: char.id,
            name: char.name,
            userId: char.userId,
            stats: char.stats || {},
            cashOnHand: char.cashOnHand || char.money || 0,
            bankBalance: char.bankBalance || 0,
            cryptoWallet: char.cryptoWallet || {},
            bankAccessLevel: char.bankAccessLevel || 1,
            lastBankVisit: char.lastBankVisit ? new Date(char.lastBankVisit) : null,
            bankInterestAccrued: char.bankInterestAccrued || 0,
            jailUntil: char.jailUntil ? new Date(char.jailUntil) : null,
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
      logger.info(`✅ Imported ${exportData.characters.length} characters`);
    }

    // Import assets
    if (exportData.assets && exportData.assets.length > 0) {
      logger.info("🏢 Importing assets...");
      for (const asset of exportData.assets) {
        await targetPrisma.asset.create({
          data: {
            id: asset.id,
            ownerId: asset.ownerId,
            type: asset.type,
            name: asset.name,
            level: asset.level || 1,
            incomeRate: asset.incomeRate || 0,
            securityLevel: asset.securityLevel || 0,
            value: asset.value || 0,
            lastIncomeTime: new Date(asset.lastIncomeTime || Date.now()),
            isForSale: asset.isForSale || false,
          }
        });
      }
      logger.info(`✅ Imported ${exportData.assets.length} assets`);
    }

    // Import action logs
    if (exportData.actionLogs && exportData.actionLogs.length > 0) {
      logger.info("📝 Importing action logs...");
      for (const log of exportData.actionLogs) {
        await targetPrisma.actionLog.create({
          data: {
            id: log.id,
            userId: log.userId,
            actionType: log.actionType,
            actionId: log.actionId,
            result: log.result,
            details: log.details || {},
            timestamp: new Date(log.timestamp),
          }
        });
      }
      logger.info(`✅ Imported ${exportData.actionLogs.length} action logs`);
    }

    // Import bank transactions
    if (exportData.bankTransactions && exportData.bankTransactions.length > 0) {
      logger.info("🏦 Importing bank transactions...");
      for (const transaction of exportData.bankTransactions) {
        await targetPrisma.bankTransaction.create({
          data: {
            id: transaction.id,
            userId: transaction.userId,
            transactionType: transaction.transactionType,
            amount: transaction.amount,
            fee: transaction.fee || 0,
            balanceBefore: transaction.balanceBefore,
            balanceAfter: transaction.balanceAfter,
            description: transaction.description,
            timestamp: new Date(transaction.timestamp),
          }
        });
      }
      logger.info(`✅ Imported ${exportData.bankTransactions.length} bank transactions`);
    }

    // Import crypto transactions
    if (exportData.cryptoTransactions && exportData.cryptoTransactions.length > 0) {
      logger.info("₿ Importing crypto transactions...");
      for (const transaction of exportData.cryptoTransactions) {
        await targetPrisma.cryptoTransaction.create({
          data: {
            id: transaction.id,
            userId: transaction.userId,
            coinType: transaction.coinType,
            transactionType: transaction.transactionType,
            amount: parseFloat(transaction.amount),
            pricePerCoin: parseFloat(transaction.pricePerCoin),
            totalValue: transaction.totalValue,
            fee: transaction.fee || 0,
            fromCurrency: transaction.fromCurrency,
            toCurrency: transaction.toCurrency,
            timestamp: new Date(transaction.timestamp),
          }
        });
      }
      logger.info(`✅ Imported ${exportData.cryptoTransactions.length} crypto transactions`);
    }

    logger.info("📊 Final verification...");
    const stats = {
      users: await targetPrisma.user.count(),
      characters: await targetPrisma.character.count(),
      assets: await targetPrisma.asset.count(),
      actionLogs: await targetPrisma.actionLog.count(),
      bankTransactions: await targetPrisma.bankTransaction.count(),
      cryptoTransactions: await targetPrisma.cryptoTransaction.count(),
    };

    logger.info("📊 SQLite database now contains:");
    Object.entries(stats).forEach(([table, count]) => {
      logger.info(`   ${table}: ${count}`);
    });

  } catch (error) {
    logger.error("❌ Import to SQLite failed:", error);
    throw error;
  } finally {
    await targetPrisma.$disconnect();
  }
}

async function clearSQLiteData(prisma: PrismaClient) {
  // Delete in dependency order
  await prisma.actionLog.deleteMany();
  await prisma.bankTransaction.deleteMany();
  await prisma.cryptoTransaction.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.character.deleteMany();
  await prisma.user.deleteMany();
  logger.info("🧹 SQLite data cleared");
}

// Run migration if called directly
if (require.main === module) {
  exportAndMigrateData().catch((error) => {
    logger.error("❌ Migration failed:", error);
    process.exit(1);
  });
}

export { exportAndMigrateData };