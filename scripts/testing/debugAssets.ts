#!/usr/bin/env ts-node

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { AssetService } from "../../src/services/AssetService";

dotenv.config();

const prisma = new PrismaClient();

async function debugAssets() {
  try {
    const discordId = process.argv[2] || "727484630386737164";

    console.log(
      `🔍 Debugging asset portfolio and upgrade costs for Discord ID: ${discordId}`
    );

    // Get user with assets
    const user = await prisma.user.findUnique({
      where: { discordId },
      include: {
        character: true,
        assets: {
          include: {
            upgrades: true,
          },
        },
      },
    });

    if (!user || !user.character) {
      console.log("❌ User or character not found!");
      process.exit(1);
    }

    console.log(`\n👤 Character: ${user.character.name}`);
    console.log(`🏢 Total Assets: ${user.assets.length}`);

    if (user.assets.length === 0) {
      console.log(
        "💡 No assets found. Buy some businesses first with /business buy"
      );
      process.exit(0);
    }

    // Calculate using the same logic as profile.ts
    const assetService = AssetService.getInstance();
    let totalBaseValue = 0;
    let totalUpgradeValue = 0;
    let totalIncome = 0;

    console.log("\n📊 Asset Breakdown:");
    console.log("=".repeat(70));

    const totalAssetValue = user.assets.reduce((sum, asset, index) => {
      const baseValue = asset.value;
      totalBaseValue += baseValue;
      totalIncome += asset.incomeRate;

      console.log(`\n${index + 1}. ${asset.name} (${asset.type})`);
      console.log(`   💰 Base Value: €${baseValue.toLocaleString()}`);
      console.log(
        `   📈 Income Rate: €${asset.incomeRate.toLocaleString()}/hour`
      );
      console.log(`   🔧 Level: ${asset.level}`);
      console.log(`   🛡️  Security: ${asset.securityLevel}`);

      // Find the template by matching asset name (same logic as profile.ts)
      let template = null;
      if (asset.name === "Convenience Store") {
        template = assetService.getAssetTemplate("convenience_store");
      } else if (asset.name === "Family Restaurant") {
        template = assetService.getAssetTemplate("restaurant");
      } else if (asset.name === "Lemonade Stand") {
        template = assetService.getAssetTemplate("test_lemonade_stand");
      }

      let upgradeValue = 0;
      if (template && template.upgrades?.income && asset.level > 1) {
        console.log(`   📋 Template: ${template.id} ✅`);
        console.log(`   🔧 Upgrade breakdown:`);

        // Sum up all upgrade costs from level 1 to current level
        for (let level = 1; level < asset.level; level++) {
          const upgradeIndex = level - 1; // Array is 0-indexed
          if (template.upgrades.income[upgradeIndex]) {
            const upgradeCost = template.upgrades.income[upgradeIndex].cost;
            const multiplier =
              template.upgrades.income[upgradeIndex].multiplier;
            upgradeValue += upgradeCost;
            console.log(
              `      Level ${level} → ${
                level + 1
              }: €${upgradeCost.toLocaleString()} (${multiplier}x income)`
            );
          }
        }
        console.log(
          `   💎 Total Upgrade Value: €${upgradeValue.toLocaleString()}`
        );
      } else if (template) {
        console.log(`   📋 Template: ${template.id} ✅`);
        console.log(`   💎 No upgrades (Level 1)`);
      } else {
        console.log(`   📋 Template: ❌ Not found`);
        console.log(`   💎 Upgrade Value: €0 (template missing)`);
      }

      totalUpgradeValue += upgradeValue;
      console.log(
        `   🏆 Total Asset Worth: €${(
          baseValue + upgradeValue
        ).toLocaleString()}`
      );

      return sum + baseValue + upgradeValue;
    }, 0);

    console.log("\n" + "=".repeat(70));
    console.log("📊 PORTFOLIO SUMMARY:");
    console.log(`💰 Base Investment: €${totalBaseValue.toLocaleString()}`);
    console.log(
      `🔧 Upgrade Investment: €${totalUpgradeValue.toLocaleString()}`
    );
    console.log(
      `💎 Total Portfolio Value: €${totalAssetValue.toLocaleString()}`
    );
    console.log(`📈 Total Hourly Income: €${totalIncome.toLocaleString()}`);
    console.log("=".repeat(70));

    console.log("\n💡 This matches the calculation used in /profile command");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

debugAssets();
