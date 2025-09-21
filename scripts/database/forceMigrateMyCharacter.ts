#!/usr/bin/env ts-node

/**
 * Force Migration Script - Overwrites SQLite with Supabase Data
 * This will replace existing SQLite data with authoritative Supabase data
 */

import { PrismaClient } from "@prisma/client";
import { logger } from "../src/utils/ResponseUtil";
import { Client } from 'pg';

async function forceMigrateCharacterData() {
  logger.info("🔄 Starting FORCE migration - Supabase data will OVERWRITE SQLite data");
  logger.info("⚠️  IMPORTANT: This will replace your SQLite character data with Supabase data!");

  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  const targetUrl = process.env.DATABASE_URL;

  if (!sourceUrl || !targetUrl) {
    logger.error("❌ Database URLs not found in environment");
    return;
  }

  // Create database connections
  const sourceClient = new Client({ connectionString: sourceUrl });
  const targetPrisma = new PrismaClient({ datasources: { db: { url: targetUrl } } });

  try {
    await sourceClient.connect();
    await targetPrisma.$connect();
    logger.info("✅ Connected to both databases");

    // Get your Discord ID from environment or hardcode it
    const yourDiscordId = "727484630386737164";
    
    // Find your user and character in Supabase
    logger.info(`🔍 Looking for user with Discord ID: ${yourDiscordId}`);
    
    const userResult = await sourceClient.query(
      `SELECT id, "discordId", username, "createdAt" FROM "User" WHERE "discordId" = $1`,
      [yourDiscordId]
    );

    if (userResult.rows.length === 0) {
      logger.error("❌ User not found in Supabase");
      return;
    }

    const supabaseUser = userResult.rows[0];
    logger.info(`✅ Found user: ${supabaseUser.username}`);

    // Get character data from Supabase
    const characterResult = await sourceClient.query(`
      SELECT id, name, "userId", stats, "cashOnHand", "bankBalance", 
             "cryptoWallet", "bankAccessLevel", "lastBankVisit", 
             "bankInterestAccrued", "totalJailTime",
             money, reputation, level, experience
      FROM "Character" 
      WHERE "userId" = $1
    `, [supabaseUser.id]);

    if (characterResult.rows.length === 0) {
      logger.error("❌ Character not found in Supabase");
      return;
    }

    const supabaseCharacter = characterResult.rows[0];
    logger.info(`✅ Found character: ${supabaseCharacter.name} (Level ${supabaseCharacter.level})`);

    // Find existing user in SQLite
    const existingUser = await targetPrisma.user.findUnique({
      where: { discordId: yourDiscordId },
      include: { character: true }
    });

    if (!existingUser) {
      logger.error("❌ User not found in SQLite");
      return;
    }

    logger.info(`📊 Current SQLite character: ${existingUser.character?.name} (Level ${existingUser.character?.level})`);
    logger.info(`📊 Supabase character: ${supabaseCharacter.name} (Level ${supabaseCharacter.level})`);

    // Update user data
    logger.info("👤 Updating user data...");
    await targetPrisma.user.update({
      where: { id: existingUser.id },
      data: {
        username: supabaseUser.username,
        createdAt: supabaseUser.createdAt,
      }
    });

    // Update character data (FORCE OVERWRITE)
    logger.info("🎭 FORCE updating character data...");
    await targetPrisma.character.update({
      where: { id: existingUser.character!.id },
      data: {
        name: supabaseCharacter.name,
        stats: supabaseCharacter.stats || {},
        cashOnHand: supabaseCharacter.cashOnHand || 0,
        bankBalance: supabaseCharacter.bankBalance || 0,
        cryptoWallet: supabaseCharacter.cryptoWallet || {},
        bankAccessLevel: supabaseCharacter.bankAccessLevel || 1,
        lastBankVisit: supabaseCharacter.lastBankVisit,
        bankInterestAccrued: supabaseCharacter.bankInterestAccrued || 0,
        totalJailTime: supabaseCharacter.totalJailTime || 0,
        money: supabaseCharacter.money || 0,
        reputation: supabaseCharacter.reputation || 0,
        level: supabaseCharacter.level || 1,
        experience: supabaseCharacter.experience || 0,
      }
    });

    logger.info("✅ Character data successfully updated!");

    // Get assets for this user from Supabase
    logger.info("🏢 Updating assets...");
    const assetsResult = await sourceClient.query(`
      SELECT id, "ownerId", type, name, level, "incomeRate", 
             "securityLevel", value, "lastIncomeTime", "isForSale"
      FROM "Asset" 
      WHERE "ownerId" = $1
    `, [supabaseUser.id]);

    logger.info(`📊 Found ${assetsResult.rows.length} assets in Supabase`);

    // Delete existing assets for this user in SQLite
    await targetPrisma.asset.deleteMany({
      where: { ownerId: existingUser.id }
    });

    // Insert assets from Supabase
    for (const asset of assetsResult.rows) {
      await targetPrisma.asset.create({
        data: {
          id: asset.id,
          ownerId: existingUser.id, // Use SQLite user ID
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

    // Verify the update
    const updatedCharacter = await targetPrisma.character.findUnique({
      where: { id: existingUser.character!.id }
    });

    const assetCount = await targetPrisma.asset.count({
      where: { ownerId: existingUser.id }
    });

    logger.info("📊 Final SQLite data:");
    logger.info(`   Character: ${updatedCharacter?.name} (Level ${updatedCharacter?.level})`);
    logger.info(`   Experience: ${updatedCharacter?.experience}`);
    logger.info(`   Reputation: ${updatedCharacter?.reputation}`);
    logger.info(`   Cash: €${updatedCharacter?.cashOnHand}`);
    logger.info(`   Bank: €${updatedCharacter?.bankBalance}`);
    logger.info(`   Assets: ${assetCount}`);

    logger.info("🎉 FORCE migration completed successfully!");
    logger.info("🎯 Your SQLite database now matches your Supabase data!");

  } catch (error) {
    logger.error("❌ Force migration failed:", error);
    throw error;
  } finally {
    await sourceClient.end();
    await targetPrisma.$disconnect();
  }
}

// Run the migration
if (require.main === module) {
  forceMigrateCharacterData()
    .then(() => {
      logger.info("🎉 Force migration completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("❌ Force migration failed:", error);
      process.exit(1);
    });
}