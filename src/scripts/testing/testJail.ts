/**
 * Test script for the jail system
 * Tests the basic functionality without running the full bot
 */

import { PrismaClient } from "@prisma/client";
import JailService from "../../services/JailService";
import { logger } from "../../utils/ResponseUtil";

const prisma = new PrismaClient();

async function testJailSystem() {
  try {
    logger.info("🧪 Testing Jail System...");

    const testDiscordId = process.env.DEBUG_DISCORD_ID;
    if (!testDiscordId) {
      logger.error("❌ DEBUG_DISCORD_ID not found in environment variables");
      logger.error("   Please set DEBUG_DISCORD_ID in your .env file");
      return;
    }

    // Test 1: Check initial jail status (should be false)
    logger.info("Test 1: Checking initial jail status");
    let jailStatus = await JailService.isPlayerInJail(testDiscordId);
    logger.info(`Initial jail status: ${jailStatus.inJail}`);

    // Test 2: Send to jail
    logger.info("Test 2: Sending player to jail");
    await JailService.sendToJail(testDiscordId, 5, "Pickpocketing", 3);
    logger.info("Player sent to jail for 5 minutes");

    // Test 3: Check jail status after being jailed
    logger.info("Test 3: Checking jail status after being jailed");
    jailStatus = await JailService.isPlayerInJail(testDiscordId);
    logger.info(`Jail status: ${JSON.stringify(jailStatus, null, 2)}`);

    // Test 4: Calculate bribe amount
    if (jailStatus.inJail) {
      logger.info(`Bribe amount: $${jailStatus.bribeAmount}`);
      logger.info(`Can afford bribe: ${jailStatus.canBribe}`);
    }

    // Test 5: Get jail stats
    logger.info("Test 5: Getting jail statistics");
    const jailStats = await JailService.getJailStats(testDiscordId);
    logger.info(`Jail stats: ${JSON.stringify(jailStats, null, 2)}`);

    // Test 6: Check if actions are blocked
    logger.info("Test 6: Checking action blocking");
    const crimeBlocking = await JailService.checkJailBlocking(testDiscordId, "crime");
    logger.info(`Crime blocking: ${crimeBlocking.blocked}`);
    if (crimeBlocking.blocked) {
      logger.info(`Block reason: ${crimeBlocking.reason}`);
    }

    // Test 7: Release from jail (cleanup)
    logger.info("Test 7: Releasing from jail");
    await JailService.releaseFromJail(testDiscordId, "test cleanup");
    logger.info("Player released from jail");

    // Test 8: Verify release
    logger.info("Test 8: Verifying release");
    jailStatus = await JailService.isPlayerInJail(testDiscordId);
    logger.info(`Final jail status: ${jailStatus.inJail}`);

    logger.info("✅ All jail system tests completed successfully!");

  } catch (error) {
    logger.error("❌ Jail system test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testJailSystem();