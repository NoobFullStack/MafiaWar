/**
 * JAIL SYSTEM TEST SCRIPT
 *
 * This script tests the new jail system functionality to ensure everything works correctly.
 * It tests creating jail records, checking status, bribing, and cooldowns.
 */

import { PrismaClient } from "@prisma/client";
import JailService from "../../src/services/JailService";

const prisma = new PrismaClient();

async function testJailSystem() {
  console.log("🧪 Testing Jail System...");

  try {
    // Find a test user (first user in database)
    const testUser = await prisma.user.findFirst({
      include: {
        character: true,
      },
    });

    if (!testUser?.character) {
      console.log("❌ No test user found. Please create a user first.");
      return;
    }

    const userId = testUser.discordId;
    console.log(`🧪 Testing with user: ${testUser.username} (${userId})`);

    // Test 1: Check initial jail status (should not be in jail)
    console.log("\n📋 Test 1: Initial jail status");
    const initialStatus = await JailService.isPlayerInJail(userId);
    console.log(`  In jail: ${initialStatus.inJail}`);

    // Test 2: Check if player can be jailed
    console.log("\n📋 Test 2: Can player be jailed?");
    const canBeJailed = await JailService.canPlayerBeJailed(userId);
    console.log(`  Can be jailed: ${canBeJailed.canBeJailed}`);
    if (!canBeJailed.canBeJailed) {
      console.log(`  Reason: ${canBeJailed.reason}`);
    }

    // Test 3: Send player to jail
    console.log("\n📋 Test 3: Sending player to jail");
    await JailService.sendToJail(userId, 30, "Test Crime", 5); // 30 minutes
    console.log("  ✅ Player sent to jail");

    // Test 4: Check jail status (should be in jail)
    console.log("\n📋 Test 4: Jail status after jailing");
    const jailStatus = await JailService.isPlayerInJail(userId);
    console.log(`  In jail: ${jailStatus.inJail}`);
    console.log(`  Crime: ${jailStatus.crime}`);
    console.log(`  Time left: ${jailStatus.timeLeftFormatted}`);
    console.log(`  Bribe amount: $${jailStatus.bribeAmount}`);

    // Test 5: Try to jail again (should fail due to already in jail)
    console.log("\n📋 Test 5: Try to jail again (should fail)");
    try {
      await JailService.sendToJail(userId, 15, "Second Crime", 3);
      console.log("  ❌ Should have failed but didn't");
    } catch (error) {
      console.log(`  ✅ Correctly failed: ${(error as Error).message}`);
    }

    // Test 6: Get jail statistics
    console.log("\n📋 Test 6: Jail statistics");
    const stats = await JailService.getJailStats(userId);
    console.log(`  Total jail time: ${stats.totalJailTime} minutes`);
    console.log(`  Currently in jail: ${stats.currentlyInJail}`);
    console.log(`  Total sentences: ${stats.totalJailSentences}`);
    console.log(`  Total bribes used: ${stats.totalBribesUsed}`);

    // Test 7: Release from jail (simulating bribe)
    console.log("\n📋 Test 7: Releasing from jail");
    await JailService.releaseFromJail(userId, "test_release");
    console.log("  ✅ Player released");

    // Test 8: Check jail status after release
    console.log("\n📋 Test 8: Status after release");
    const postReleaseStatus = await JailService.isPlayerInJail(userId);
    console.log(`  In jail: ${postReleaseStatus.inJail}`);

    // Test 9: Check release cooldown
    console.log("\n📋 Test 9: Release cooldown check");
    const cooldownStatus = await JailService.checkReleaseCooldown(userId);
    console.log(`  On cooldown: ${cooldownStatus.onCooldown}`);
    if (cooldownStatus.onCooldown) {
      console.log(`  Time left: ${cooldownStatus.timeLeftFormatted}`);
    }

    // Test 10: Try to jail during cooldown (should fail)
    console.log("\n📋 Test 10: Try to jail during cooldown (should fail)");
    try {
      await JailService.sendToJail(userId, 15, "Cooldown Test Crime", 3);
      console.log("  ❌ Should have failed but didn't");
    } catch (error) {
      console.log(`  ✅ Correctly failed: ${(error as Error).message}`);
    }

    console.log("\n✅ All jail system tests completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testJailSystem()
    .then(() => {
      console.log("🎉 Test script completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Test script failed:", error);
      process.exit(1);
    });
}

export default testJailSystem;
