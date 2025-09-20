/**
 * Test script specifically for the bribe payment system
 * Tests the payment logic with different money combinations
 */

import { PrismaClient } from "@prisma/client";
import JailService from "../src/services/JailService";
import { logger } from "../src/utils/ResponseUtil";
import DatabaseManager from "../src/utils/DatabaseManager";

const prisma = new PrismaClient();

async function testBribePayments() {
  try {
    logger.info("🧪 Testing Bribe Payment System...");

    const testDiscordId = process.env.DEBUG_DISCORD_ID;
    if (!testDiscordId) {
      logger.error("❌ DEBUG_DISCORD_ID not found in environment variables");
      logger.error("   Please set DEBUG_DISCORD_ID in your .env file");
      return;
    }

    // First, let's check current balances and set up a test scenario
    const user = await DatabaseManager.getUserForAuth(testDiscordId);
    if (!user?.character) {
      logger.error("No character found for testing");
      return;
    }

    logger.info(`Current balances - Cash: $${user.character.cashOnHand}, Bank: $${user.character.bankBalance}`);

    // Test 1: Set up some money for testing
    logger.info("Test 1: Setting up test money (cash: $500, bank: $600)");
    await prisma.character.update({
      where: { id: user.character.id },
      data: {
        cashOnHand: 500,
        bankBalance: 600
      }
    });

    // Test 2: Send to jail with a bribe that requires both cash + bank
    logger.info("Test 2: Sending player to jail");
    await JailService.sendToJail(testDiscordId, 10, "Test Crime", 5);
    
    // Test 3: Check bribe amount and jail status
    logger.info("Test 3: Checking jail status and bribe amount");
    const jailStatus = await JailService.isPlayerInJail(testDiscordId);
    logger.info(`Jail status: In jail: ${jailStatus.inJail}, Bribe: $${jailStatus.bribeAmount}, Can afford: ${jailStatus.canBribe}`);
    
    if (jailStatus.inJail && jailStatus.canBribe) {
      // Test 4: Try to pay bribe (should work with cash + bank combination)
      logger.info("Test 4: Attempting to pay bribe");
      const bribeResult = await JailService.processBribe(testDiscordId);
      logger.info(`Bribe result: Success: ${bribeResult.success}`);
      if (bribeResult.success) {
        logger.info(`Bribe message: ${bribeResult.message}`);
      } else {
        logger.error(`Bribe failed: ${bribeResult.message}`);
      }
    } else if (jailStatus.inJail && !jailStatus.canBribe) {
      logger.info("Cannot afford bribe with current money, that's expected for this test");
      
      // Test 5: Add more money and try again
      logger.info("Test 5: Adding more money to afford the bribe");
      await prisma.character.update({
        where: { id: user.character.id },
        data: {
          cashOnHand: 2000,
          bankBalance: 5000  // Total €7000 should be enough for any bribe
        }
      });
      
      const newBribeResult = await JailService.processBribe(testDiscordId);
      logger.info(`New bribe result: Success: ${newBribeResult.success}`);
      if (newBribeResult.success) {
        logger.info(`Bribe message: ${newBribeResult.message}`);
      } else {
        logger.error(`Bribe still failed: ${newBribeResult.message}`);
      }
    }

    // Test 6: Verify player is out of jail
    logger.info("Test 6: Verifying jail status after bribe");
    const finalStatus = await JailService.isPlayerInJail(testDiscordId);
    logger.info(`Final jail status: ${finalStatus.inJail}`);

    // Check final balances
    const finalUser = await DatabaseManager.getUserForAuth(testDiscordId);
    if (finalUser?.character) {
      logger.info(`Final balances - Cash: $${finalUser.character.cashOnHand}, Bank: $${finalUser.character.bankBalance}`);
    }

    logger.info("✅ Bribe payment system test completed!");

  } catch (error) {
    logger.error("❌ Bribe payment test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testBribePayments();