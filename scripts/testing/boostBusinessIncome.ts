/**
 * Business Income Booster - For Testing Collection Announcements
 *
 * This script temporarily boosts business income rates and sets lastIncomeTime
 * to allow for immediate large collections for testing the announcement system.
 *
 * Run with: yarn ts-node src/scripts/testing/boostBusinessIncome.ts <discordId>
 */

import { PrismaClient } from "@prisma/client";
import { BotBranding } from "../src/config/bot";

const prisma = new PrismaClient();

interface BoostConfig {
  multiplier: number;
  hoursBack: number;
  description: string;
}

const boostConfigs: Record<string, BoostConfig> = {
  small: {
    multiplier: 2,
    hoursBack: 4,
    description: "Small boost for testing medium collections",
  },
  medium: {
    multiplier: 5,
    hoursBack: 8,
    description: "Medium boost for testing large collections",
  },
  large: {
    multiplier: 10,
    hoursBack: 12,
    description: "Large boost for testing massive collections",
  },
  extreme: {
    multiplier: 20,
    hoursBack: 24,
    description: "Extreme boost for testing mega collections",
  },
};

async function boostUserBusinesses(
  discordId: string,
  boostLevel: string
): Promise<void> {
  const config = boostConfigs[boostLevel];
  if (!config) {
    throw new Error(
      `Invalid boost level. Available: ${Object.keys(boostConfigs).join(", ")}`
    );
  }

  console.log(
    `🚀 Applying ${boostLevel} boost to businesses for user ${discordId}`
  );
  console.log(`   ${config.description}`);
  console.log(`   Multiplier: ${config.multiplier}x`);
  console.log(`   Time back: ${config.hoursBack} hours`);

  // Find user
  const user = await prisma.user.findUnique({
    where: { discordId },
    include: {
      assets: true,
      character: true,
    },
  });

  if (!user) {
    throw new Error(`User with Discord ID ${discordId} not found`);
  }

  if (!user.character) {
    throw new Error(`User ${discordId} doesn't have a character`);
  }

  console.log(`✅ Found user: ${user.username}`);
  console.log(`   Assets owned: ${user.assets.length}`);

  if (user.assets.length === 0) {
    console.log("❌ User has no business assets to boost");
    return;
  }

  // Calculate new time for income generation
  const lastIncomeTime = new Date(
    Date.now() - config.hoursBack * 60 * 60 * 1000
  );

  let totalPendingIncome = 0;

  // Boost each asset
  for (const asset of user.assets) {
    const originalRate = asset.incomeRate;
    const newRate = originalRate * config.multiplier;
    const pendingIncome = newRate * config.hoursBack;

    totalPendingIncome += pendingIncome;

    await prisma.asset.update({
      where: { id: asset.id },
      data: {
        incomeRate: newRate,
        lastIncomeTime: lastIncomeTime,
      },
    });

    console.log(`   📈 ${asset.name}:`);
    console.log(
      `      Rate: ${BotBranding.formatCurrency(
        originalRate
      )}/hr → ${BotBranding.formatCurrency(newRate)}/hr`
    );
    console.log(`      Pending: ${BotBranding.formatCurrency(pendingIncome)}`);
  }

  console.log(
    `\n💰 Total Pending Income: ${BotBranding.formatCurrency(
      totalPendingIncome
    )}`
  );
  console.log(
    `\n✅ Boost applied! User can now collect and test announcements.`
  );
  console.log(`\n⚠️  Remember to restore original rates after testing!`);
}

async function restoreOriginalRates(discordId: string): Promise<void> {
  console.log(`🔄 Restoring original income rates for user ${discordId}`);

  // Find user assets
  const user = await prisma.user.findUnique({
    where: { discordId },
    include: { assets: true },
  });

  if (!user || user.assets.length === 0) {
    console.log("❌ No assets found to restore");
    return;
  }

  // Restore based on asset level (simplified restoration)
  for (const asset of user.assets) {
    // Base rates by type and level (simplified)
    const baseRates: Record<string, number> = {
      convenience_store: 5000,
      restaurant: 15000,
      nightclub: 35000,
      casino: 75000,
      warehouse: 25000,
      factory: 50000,
    };

    const baseRate = baseRates[asset.type] || 10000;
    const levelMultiplier = 1 + (asset.level - 1) * 0.5; // 50% increase per level
    const originalRate = Math.floor(baseRate * levelMultiplier);

    await prisma.asset.update({
      where: { id: asset.id },
      data: {
        incomeRate: originalRate,
        lastIncomeTime: new Date(), // Reset collection time
      },
    });

    console.log(
      `   🔧 ${asset.name}: ${BotBranding.formatCurrency(
        originalRate
      )}/hr (Level ${asset.level})`
    );
  }

  console.log("✅ Original rates restored!");
}

async function showUserAssets(discordId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { discordId },
    include: { assets: true },
  });

  if (!user) {
    console.log(`❌ User ${discordId} not found`);
    return;
  }

  console.log(`📊 Assets for ${user.username}:`);

  if (user.assets.length === 0) {
    console.log("   No assets owned");
    return;
  }

  user.assets.forEach((asset, index) => {
    const hoursElapsed = Math.max(
      0,
      (Date.now() - asset.lastIncomeTime.getTime()) / (1000 * 60 * 60)
    );
    const pendingIncome = asset.incomeRate * hoursElapsed;

    console.log(`   ${index + 1}. ${asset.name} (Level ${asset.level})`);
    console.log(`      Type: ${asset.type}`);
    console.log(
      `      Rate: ${BotBranding.formatCurrency(asset.incomeRate)}/hr`
    );
    console.log(`      Hours since collection: ${hoursElapsed.toFixed(1)}`);
    console.log(
      `      Pending: ${BotBranding.formatCurrency(Math.floor(pendingIncome))}`
    );
    console.log("");
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("🎭 Business Income Booster - Testing Tool");
    console.log("==========================================");
    console.log("");
    console.log("Usage:");
    console.log(
      "  yarn ts-node src/scripts/testing/boostBusinessIncome.ts <discordId> [action] [level]"
    );
    console.log("");
    console.log("Actions:");
    console.log("  boost [level]  - Boost income rates (default: medium)");
    console.log("  restore        - Restore original rates");
    console.log("  show           - Show current assets");
    console.log("");
    console.log("Boost Levels:");
    Object.entries(boostConfigs).forEach(([level, config]) => {
      console.log(`  ${level.padEnd(8)} - ${config.description}`);
    });
    console.log("");
    console.log("Examples:");
    console.log(
      "  yarn ts-node src/scripts/testing/boostBusinessIncome.ts 1234567890 boost large"
    );
    console.log(
      "  yarn ts-node src/scripts/testing/boostBusinessIncome.ts 1234567890 show"
    );
    console.log(
      "  yarn ts-node src/scripts/testing/boostBusinessIncome.ts 1234567890 restore"
    );
    return;
  }

  const discordId = args[0];
  const action = args[1] || "boost";
  const level = args[2] || "medium";

  try {
    await prisma.$connect();
    console.log("✅ Connected to database");

    switch (action) {
      case "boost":
        await boostUserBusinesses(discordId, level);
        break;
      case "restore":
        await restoreOriginalRates(discordId);
        break;
      case "show":
        await showUserAssets(discordId);
        break;
      default:
        console.log(`❌ Unknown action: ${action}`);
        return;
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

if (require.main === module) {
  main().catch(console.error);
}
