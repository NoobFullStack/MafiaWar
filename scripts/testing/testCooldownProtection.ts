/**
 * QUICK COOLDOWN TEST
 *
 * This script tests just the cooldown protection message flow
 */

import { PrismaClient } from "@prisma/client";
import { CrimeService } from "../../src/services/CrimeService";
import JailService from "../../src/services/JailService";

const prisma = new PrismaClient();

async function testCooldownProtection() {
  console.log("🧪 Testing Cooldown Protection Message...");

  try {
    // Find a test user
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

    // Test cooldown status
    const cooldownStatus = await JailService.checkReleaseCooldown(userId);
    console.log(`\n📋 Current cooldown status:`);
    console.log(`  On cooldown: ${cooldownStatus.onCooldown}`);
    if (cooldownStatus.onCooldown) {
      console.log(`  Time left: ${cooldownStatus.timeLeftFormatted}`);
    }

    // If not on cooldown, create a test scenario
    if (!cooldownStatus.onCooldown) {
      console.log("\n🔧 Creating test cooldown scenario...");

      // Jail the player briefly and then release them
      await JailService.sendToJail(userId, 1, "Test Crime", 3); // 1 minute
      console.log("  ✅ Player jailed");

      await JailService.releaseFromJail(userId, "test_release");
      console.log("  ✅ Player released (cooldown should now be active)");

      // Check cooldown again
      const newCooldownStatus = await JailService.checkReleaseCooldown(userId);
      console.log(`  ✅ Cooldown active: ${newCooldownStatus.onCooldown}`);
      console.log(`  ✅ Time left: ${newCooldownStatus.timeLeftFormatted}`);
    }

    // Test crime attempt during cooldown
    console.log("\n📋 Testing crime during cooldown protection...");
    try {
      const crimeResult = await CrimeService.executeCrime(
        "pickpocketing",
        userId
      );
      console.log("✅ Crime executed successfully:");
      console.log(`  Success: ${crimeResult.success}`);
      console.log(
        `  Message preview: ${crimeResult.message.substring(0, 100)}...`
      );

      // Check if message contains cooldown protection info
      if (crimeResult.message.includes("Release Protection Active")) {
        console.log("  ✅ Cooldown protection message properly included!");
      } else if (crimeResult.message.includes("protected from jail")) {
        console.log("  ✅ Cooldown info properly included in message!");
      } else {
        console.log("  ⚠️  Cooldown protection message not found in result");
      }
    } catch (error) {
      console.log(`❌ Crime execution failed: ${(error as Error).message}`);
    }

    console.log("\n✅ Cooldown protection test completed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testCooldownProtection()
    .then(() => {
      console.log("🎉 Test script completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Test script failed:", error);
      process.exit(1);
    });
}

export default testCooldownProtection;
