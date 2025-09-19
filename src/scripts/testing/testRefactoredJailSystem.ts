/**
 * Test script for the refactored jail system
 * Tests the new table structure and cooldown functionality
 */

import { PrismaClient } from "@prisma/client";
import JailService from "../../services/JailService";
import { logger } from "../../utils/ResponseUtil";

const prisma = new PrismaClient();

async function testRefactoredJailSystem() {
  try {
    logger.info("🧪 Testing Refactored Jail System...");

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

    // Test 2: Check if player can be jailed (should be true initially)
    logger.info("Test 2: Checking if player can be jailed");
    let canBeJailed = await JailService.canPlayerBeJailed(testDiscordId);
    logger.info(`Can be jailed: ${canBeJailed.canBeJailed}`);
    if (!canBeJailed.canBeJailed) {
      logger.info(`Reason: ${canBeJailed.reason}`);
    }

    // Test 3: Send to jail
    logger.info("Test 3: Sending player to jail");
    await JailService.sendToJail(testDiscordId, 2, "Test Crime", 5);
    logger.info("Player sent to jail for 2 minutes");

    // Test 4: Check jail status after being jailed
    logger.info("Test 4: Checking jail status after being jailed");
    jailStatus = await JailService.isPlayerInJail(testDiscordId);
    logger.info(`Jail status: ${jailStatus.inJail}`);
    if (jailStatus.inJail) {
      logger.info(`Crime: ${jailStatus.crime}`);
      logger.info(`Time left: ${jailStatus.timeLeftFormatted}`);
      logger.info(`Severity: ${jailStatus.severity}`);
      logger.info(`Bribe amount: ${jailStatus.bribeAmount}`);
    }

    // Test 5: Check jail blocking
    logger.info("Test 5: Checking jail blocking for crimes");
    const crimeBlocking = await JailService.checkJailBlocking(testDiscordId, "crime");
    logger.info(`Crime blocking: ${crimeBlocking.blocked}`);
    if (crimeBlocking.blocked) {
      logger.info(`Block reason: ${crimeBlocking.reason}`);
    }

    // Test 6: Get jail stats
    logger.info("Test 6: Getting jail statistics");
    const jailStats = await JailService.getJailStats(testDiscordId);
    logger.info(`Total jail time: ${jailStats.totalJailTime} minutes`);
    logger.info(`Total jail sentences: ${jailStats.totalJailSentences}`);
    logger.info(`Total bribes used: ${jailStats.totalBribesUsed}`);
    logger.info(`Currently in jail: ${jailStats.currentlyInJail}`);

    // Test 7: Release from jail manually
    logger.info("Test 7: Releasing from jail manually");
    await JailService.releaseFromJail(testDiscordId, "test release");
    logger.info("Player released from jail");

    // Test 8: Check cooldown status
    logger.info("Test 8: Checking release cooldown");
    const cooldownStatus = await JailService.checkReleaseCooldown(testDiscordId);
    logger.info(`On cooldown: ${cooldownStatus.onCooldown}`);
    if (cooldownStatus.onCooldown) {
      logger.info(`Cooldown time left: ${cooldownStatus.timeLeftFormatted}`);
    }

    // Test 9: Try to jail again immediately (should fail due to cooldown)
    logger.info("Test 9: Trying to jail again immediately (should fail)");
    try {
      await JailService.sendToJail(testDiscordId, 1, "Test Crime 2", 3);
      logger.error("❌ ERROR: Player was jailed despite being on cooldown!");
    } catch (error: any) {
      logger.info(`✅ Correctly blocked: ${error.message}`);
    }

    // Test 10: Check final status
    logger.info("Test 10: Checking final jail status");
    jailStatus = await JailService.isPlayerInJail(testDiscordId);
    logger.info(`Final jail status: ${jailStatus.inJail}`);

    // Test 11: Get updated jail stats
    logger.info("Test 11: Getting updated jail statistics");
    const finalStats = await JailService.getJailStats(testDiscordId);
    logger.info(`Final total jail sentences: ${finalStats.totalJailSentences}`);
    logger.info(`Release cooldown active: ${finalStats.releaseCooldown?.onCooldown || false}`);

    logger.info("✅ All refactored jail system tests completed successfully!");

  } catch (error) {
    logger.error("❌ Refactored jail system test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testRefactoredJailSystem();