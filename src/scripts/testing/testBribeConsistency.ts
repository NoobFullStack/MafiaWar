/**
 * Test script to verify bribe amount consistency
 * This ensures the bribe amount doesn't change between status checks
 */

import { PrismaClient } from "@prisma/client";
import JailService from "../../services/JailService";
import { logger } from "../../utils/ResponseUtil";

const prisma = new PrismaClient();

async function testBribeConsistency() {
  try {
    logger.info("🧪 Testing Bribe Amount Consistency...");

    const testDiscordId = process.env.DEBUG_DISCORD_ID;
    if (!testDiscordId) {
      logger.error("❌ DEBUG_DISCORD_ID not found in environment variables");
      logger.error("   Please set DEBUG_DISCORD_ID in your .env file");
      return;
    }

    // Test 1: Send to jail
    logger.info("Test 1: Sending player to jail");
    await JailService.sendToJail(testDiscordId, 10, "Test Crime", 5);
    
    // Test 2: Check bribe amount multiple times with delays
    logger.info("Test 2: Checking bribe amount consistency");
    
    const checks: any[] = [];
    for (let i = 0; i < 5; i++) {
      const jailStatus = await JailService.isPlayerInJail(testDiscordId);
      checks.push({
        check: i + 1,
        bribeAmount: jailStatus.bribeAmount,
        timeLeft: jailStatus.timeLeft
      });
      
      logger.info(`Check ${i + 1}: Bribe amount: €${jailStatus.bribeAmount}, Time left: ${jailStatus.timeLeft}m`);
      
      // Small delay between checks
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Test 3: Verify all bribe amounts are the same
    const firstBribeAmount = checks[0].bribeAmount;
    const allSame = checks.every(check => check.bribeAmount === firstBribeAmount);
    
    if (allSame) {
      logger.info("✅ SUCCESS: All bribe amounts are consistent!");
      logger.info(`   All checks returned: €${firstBribeAmount}`);
    } else {
      logger.error("❌ FAILURE: Bribe amounts are inconsistent!");
      logger.error("   Amounts:", checks.map(c => `Check ${c.check}: €${c.bribeAmount}`));
    }
    
    // Test 4: Clean up
    logger.info("Test 4: Cleaning up");
    await JailService.releaseFromJail(testDiscordId, "test cleanup");
    logger.info("Player released from jail");

    logger.info("✅ Bribe consistency test completed!");

  } catch (error) {
    logger.error("❌ Bribe consistency test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testBribeConsistency();