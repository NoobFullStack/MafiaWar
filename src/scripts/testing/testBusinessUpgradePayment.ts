/**
 * Test script for business upgrade payment system
 * Tests negative balance prevention and mixed payment handling
 */

import { PrismaClient } from "@prisma/client";
import { AssetService } from "../../services/AssetService";
import { logger } from "../../utils/ResponseUtil";
import DatabaseManager from "../../utils/DatabaseManager";

const prisma = new PrismaClient();

async function testBusinessUpgradePayments() {
  try {
    logger.info("🧪 Testing Business Upgrade Payment System...");

    const testDiscordId = process.env.DEBUG_DISCORD_ID;
    if (!testDiscordId) {
      logger.error("❌ DEBUG_DISCORD_ID not found in environment variables");
      logger.error("   Please set DEBUG_DISCORD_ID in your .env file");
      return;
    }

    // Get or create test user
    const user = await DatabaseManager.getUserForAuth(testDiscordId);
    if (!user?.character) {
      logger.error("No character found for testing");
      return;
    }

    const assetService = AssetService.getInstance();

    logger.info(`Initial balances - Cash: $${user.character.cashOnHand}, Bank: $${user.character.bankBalance}`);

    // Test 1: Set up test scenario with insufficient funds
    logger.info("Test 1: Setting up test scenario (cash: $50, bank: $150, total: $200)");
    await prisma.character.update({
      where: { id: user.character.id },
      data: {
        cashOnHand: 50,
        bankBalance: 150,
        level: 10 // Ensure high enough level for business
      }
    });

    // Test 2: Purchase a business asset first (if none exists)
    logger.info("Test 2: Ensuring user has a business asset to upgrade");
    const assets = await assetService.getPlayerAssets(testDiscordId);
    let testAssetId: string;

    if (assets.length === 0) {
      // Need to give enough money to buy an asset first
      await prisma.character.update({
        where: { id: user.character.id },
        data: {
          cashOnHand: 20000,
          bankBalance: 5000
        }
      });

      // Purchase a cheap asset for testing
      const purchaseResult = await assetService.purchaseAsset(testDiscordId, "convenience_store", "mixed");
      if (!purchaseResult.success) {
        logger.error(`Failed to purchase test asset: ${purchaseResult.message}`);
        return;
      }

      const newAssets = await assetService.getPlayerAssets(testDiscordId);
      testAssetId = newAssets[0].id;
      logger.info(`Purchased test asset: ${newAssets[0].name} (ID: ${testAssetId})`);
    } else {
      testAssetId = assets[0].id;
      logger.info(`Using existing asset: ${assets[0].name} (ID: ${testAssetId})`);
    }

    // Test 3: Reset balances to insufficient amount
    logger.info("Test 3: Resetting to insufficient funds for upgrade test");
    await prisma.character.update({
      where: { id: user.character.id },
      data: {
        cashOnHand: 50,
        bankBalance: 150 // Total $200, probably not enough for upgrade
      }
    });

    // Test 4: Attempt upgrade with insufficient total funds (should fail)
    logger.info("Test 4: Attempting upgrade with insufficient total funds");
    const insufficientResult = await assetService.upgradeAsset(testDiscordId, testAssetId, "income", "mixed");
    logger.info(`Insufficient funds result: Success: ${insufficientResult.success}`);
    logger.info(`Message: ${insufficientResult.message}`);

    // Check balances after insufficient funds test
    const afterInsufficientUser = await DatabaseManager.getUserForAuth(testDiscordId);
    logger.info(`Balances after insufficient test - Cash: $${afterInsufficientUser?.character?.cashOnHand}, Bank: $${afterInsufficientUser?.character?.bankBalance}`);

    // Test 5: Set sufficient funds but test edge case
    logger.info("Test 5: Setting sufficient funds for mixed payment test");
    await prisma.character.update({
      where: { id: user.character.id },
      data: {
        cashOnHand: 300,
        bankBalance: 2000 // Should be enough for most upgrades
      }
    });

    // Test 6: Attempt upgrade with sufficient funds
    logger.info("Test 6: Attempting upgrade with sufficient mixed funds");
    const sufficientResult = await assetService.upgradeAsset(testDiscordId, testAssetId, "income", "mixed");
    logger.info(`Sufficient funds result: Success: ${sufficientResult.success}`);
    logger.info(`Message: ${sufficientResult.message}`);

    // Check final balances
    const finalUser = await DatabaseManager.getUserForAuth(testDiscordId);
    logger.info(`Final balances - Cash: $${finalUser?.character?.cashOnHand}, Bank: $${finalUser?.character?.bankBalance}`);

    // Test 7: Verify no negative balances occurred
    logger.info("Test 7: Verifying no negative balances");
    if (finalUser?.character?.cashOnHand !== undefined && finalUser.character.cashOnHand < 0) {
      logger.error(`❌ NEGATIVE CASH DETECTED: $${finalUser.character.cashOnHand}`);
    } else {
      logger.info(`✅ Cash balance is non-negative: $${finalUser?.character?.cashOnHand}`);
    }

    if (finalUser?.character?.bankBalance !== undefined && finalUser.character.bankBalance < 0) {
      logger.error(`❌ NEGATIVE BANK DETECTED: $${finalUser.character.bankBalance}`);
    } else {
      logger.info(`✅ Bank balance is non-negative: $${finalUser?.character?.bankBalance}`);
    }

    logger.info("✅ Business upgrade payment system test completed!");

  } catch (error) {
    logger.error("❌ Business upgrade payment test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testBusinessUpgradePayments();