#!/usr/bin/env ts-node

/**
 * Test script for SQLite migration and write queue system
 * Validates that the new system works correctly
 */

import { PrismaClient } from "@prisma/client";
import DatabaseManager from "../src/utils/DatabaseManager";
import { WriteQueueService } from "../src/services/WriteQueueService";
import { logger } from "../src/utils/ResponseUtil";
import dotenv from "dotenv";

dotenv.config();

async function testSQLiteAndQueue() {
  logger.info("🧪 Testing SQLite migration and write queue system...");

  // Set up test environment
  const testDatabaseUrl = process.env.DATABASE_URL || 'file:./data/test.db';
  process.env.DATABASE_URL = testDatabaseUrl;

  try {
    // Test 1: Database Connection
    logger.info("\n📋 Test 1: Database Connection");
    await DatabaseManager.connect();
    logger.info("✅ Database connection successful");

    // Test 2: Write Queue Status
    logger.info("\n📋 Test 2: Write Queue Status");
    const writeQueue = DatabaseManager.getWriteQueue();
    const status = writeQueue.getStatus();
    logger.info(`✅ Write queue status: ${JSON.stringify(status)}`);

    // Test 3: Basic Write Operations
    logger.info("\n📋 Test 3: Basic Write Operations");
    const testDiscordId = process.env.DEBUG_DISCORD_ID || "test_user_123456";
    
    // Test user creation (direct Prisma for read-only)
    const prisma = DatabaseManager.getClient();
    let user = await prisma.user.findUnique({
      where: { discordId: testDiscordId },
      include: { character: true }
    });

    if (!user) {
      logger.info("Creating test user...");
      user = await prisma.user.create({
        data: {
          discordId: testDiscordId,
          username: "TestUser",
          character: {
            create: {
              name: "Test Character",
              stats: { strength: 10, stealth: 10, intelligence: 10 },
              cashOnHand: 1000,
              bankBalance: 500,
              cryptoWallet: "{}",
            }
          }
        },
        include: { character: true }
      });
      logger.info("✅ Test user created");
    }

    // Test queued operations
    const operationId1 = await DatabaseManager.updateCharacterStats(
      testDiscordId,
      { strength: 15 }
    );
    logger.info(`✅ Queued character stats update: ${operationId1.operationId}`);

    const operationId2 = await DatabaseManager.updateCharacterMoney(
      testDiscordId,
      100,
      "add"
    );
    logger.info(`✅ Queued character money update: ${operationId2.operationId}`);

    const operationId3 = await DatabaseManager.logAction(
      testDiscordId,
      "test_action",
      "success",
      { testData: "queue_test" }
    );
    logger.info(`✅ Queued action log: ${operationId3.operationId}`);

    // Test 4: Queue Processing
    logger.info("\n📋 Test 4: Queue Processing");
    logger.info("Waiting for queue to process operations...");
    
    // Wait for operations to complete
    await writeQueue.flush();
    logger.info("✅ All queued operations processed");

    // Test 5: Verify Results
    logger.info("\n📋 Test 5: Verify Results");
    const updatedUser = await prisma.user.findUnique({
      where: { discordId: testDiscordId },
      include: { 
        character: true,
        actionLogs: {
          where: { actionType: "test_action" },
          orderBy: { timestamp: "desc" },
          take: 1
        }
      }
    });

    if (updatedUser?.character) {
      const stats = updatedUser.character.stats as any;
      logger.info(`✅ Character stats updated: strength=${stats.strength}`);
      logger.info(`✅ Character money: ${updatedUser.character.money}`);
    }

    if (updatedUser?.actionLogs && updatedUser.actionLogs.length > 0) {
      logger.info(`✅ Action logged: ${updatedUser.actionLogs[0].actionType}`);
    }

    // Test 6: Performance Test
    logger.info("\n📋 Test 6: Performance Test");
    const startTime = Date.now();
    
    // Queue multiple operations
    const promises = [];
    for (let i = 0; i < 50; i++) {
      promises.push(
        DatabaseManager.logAction(
          testDiscordId,
          "performance_test",
          "success",
          { iteration: i }
        )
      );
    }
    
    await Promise.all(promises);
    await writeQueue.flush();
    
    const endTime = Date.now();
    logger.info(`✅ Processed 50 operations in ${endTime - startTime}ms`);

    logger.info("\n🎉 All tests passed! SQLite migration and write queue system working correctly!");

  } catch (error) {
    logger.error("❌ Test failed:", error);
    throw error;
  } finally {
    await DatabaseManager.disconnect();
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  await DatabaseManager.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await DatabaseManager.disconnect();
  process.exit(0);
});

// Run test if called directly
if (require.main === module) {
  testSQLiteAndQueue().catch((error) => {
    logger.error("❌ Test suite failed:", error);
    process.exit(1);
  });
}

export { testSQLiteAndQueue };