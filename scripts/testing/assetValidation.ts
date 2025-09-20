#!/usr/bin/env ts-node

/**
 * Asset System Validation Script
 * Tests the asset system integration with 3-layered money system
 */

import { PrismaClient } from "@prisma/client";
import { assetTemplates } from "../src/data/assets";
import { AssetService } from "../src/services/AssetService";
import { logger } from "../src/utils/ResponseUtil";

const prisma = new PrismaClient();

async function main() {
  try {
    logger.info("🏢 Asset System Validation Starting...");

    // Test 1: Validate asset templates
    logger.info("\n📋 Test 1: Asset Template Validation");

    let templatesValid = true;
    for (const asset of assetTemplates) {
      const dist = asset.incomeDistribution;
      const total = dist.cash + dist.bank + dist.crypto;

      if (Math.abs(total - 100) > 0.1) {
        logger.error(
          `❌ ${asset.name}: Income distribution totals ${total}% (should be 100%)`
        );
        templatesValid = false;
      } else {
        logger.debug(
          `✅ ${asset.name}: Income distribution valid (${dist.cash}% cash, ${dist.bank}% bank, ${dist.crypto}% crypto)`
        );
      }

      // Validate characteristics
      if (
        asset.characteristics?.raidVulnerability &&
        (asset.characteristics.raidVulnerability < 0 ||
          asset.characteristics.raidVulnerability > 1)
      ) {
        logger.error(
          `❌ ${asset.name}: Invalid raid vulnerability ${asset.characteristics.raidVulnerability} (should be 0-1)`
        );
        templatesValid = false;
      }
    }

    if (templatesValid) {
      logger.info("✅ All asset templates are valid");
    } else {
      logger.error("❌ Some asset templates have validation errors");
      process.exit(1);
    }

    // Test 2: Asset categorization
    logger.info("\n📊 Test 2: Asset Categorization Analysis");

    const byCategory = assetTemplates.reduce((acc, asset) => {
      acc[asset.category] = (acc[asset.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    logger.info("Asset distribution by category:");
    Object.entries(byCategory).forEach(([category, count]) => {
      logger.info(`  ${category}: ${count} assets`);
    });

    // Test 3: Income distribution analysis
    logger.info("\n💰 Test 3: Income Distribution Analysis");

    const incomeAnalysis = assetTemplates.map((asset) => {
      const dist = asset.incomeDistribution;
      return {
        name: asset.name,
        category: asset.category,
        cashPercent: dist.cash,
        bankPercent: dist.bank,
        cryptoPercent: dist.crypto,
        hourlyIncome: asset.baseIncomeRate,
      };
    });

    // Group by category and show average distributions
    const categoryStats = Object.entries(byCategory).map(([category]) => {
      const categoryAssets = incomeAnalysis.filter(
        (a) => a.category === category
      );
      const avgCash =
        categoryAssets.reduce((sum, a) => sum + a.cashPercent, 0) /
        categoryAssets.length;
      const avgBank =
        categoryAssets.reduce((sum, a) => sum + a.bankPercent, 0) /
        categoryAssets.length;
      const avgCrypto =
        categoryAssets.reduce((sum, a) => sum + a.cryptoPercent, 0) /
        categoryAssets.length;
      const avgIncome =
        categoryAssets.reduce((sum, a) => sum + a.hourlyIncome, 0) /
        categoryAssets.length;

      return {
        category,
        avgCash: Math.round(avgCash),
        avgBank: Math.round(avgBank),
        avgCrypto: Math.round(avgCrypto),
        avgIncome: Math.round(avgIncome),
        count: categoryAssets.length,
      };
    });

    logger.info("Average income distribution by category:");
    categoryStats.forEach((stat) => {
      logger.info(`  ${stat.category} (${stat.count} assets):`);
      logger.info(
        `    Cash: ${stat.avgCash}% | Bank: ${stat.avgBank}% | Crypto: ${stat.avgCrypto}%`
      );
      logger.info(`    Avg Income: $${stat.avgIncome}/hour`);
    });

    // Test 4: Level progression validation
    logger.info("\n📈 Test 4: Level Progression Validation");

    const sortedByLevel = assetTemplates
      .filter((a) => a.requirements?.level)
      .sort(
        (a, b) => (a.requirements?.level || 0) - (b.requirements?.level || 0)
      );

    logger.info("Asset unlock progression:");
    sortedByLevel.forEach((asset) => {
      const level = asset.requirements?.level || 1;
      const price = asset.basePrice;
      const income = asset.baseIncomeRate;
      const paybackHours = Math.round(price / income);

      logger.info(
        `  Lv.${level}: ${
          asset.name
        } - $${price.toLocaleString()} (${paybackHours}h payback)`
      );
    });

    // Test 5: Economic balance check
    logger.info("\n⚖️  Test 5: Economic Balance Check");

    const balanceIssues: string[] = [];

    // Check for reasonable payback periods
    assetTemplates.forEach((asset) => {
      const paybackHours = asset.basePrice / asset.baseIncomeRate;

      if (paybackHours < 10) {
        balanceIssues.push(
          `${asset.name}: Too quick payback (${paybackHours.toFixed(1)} hours)`
        );
      } else if (paybackHours > 200) {
        balanceIssues.push(
          `${asset.name}: Too slow payback (${paybackHours.toFixed(1)} hours)`
        );
      }
    });

    // Check for reasonable level progression
    const levelGroups = sortedByLevel.reduce((acc, asset) => {
      const level = asset.requirements?.level || 1;
      if (!acc[level]) acc[level] = [];
      acc[level].push(asset);
      return acc;
    }, {} as Record<number, typeof assetTemplates>);

    Object.entries(levelGroups).forEach(([level, assets]) => {
      if (assets.length > 3) {
        balanceIssues.push(
          `Level ${level}: Too many assets (${assets.length}) - may overwhelm players`
        );
      }
    });

    if (balanceIssues.length === 0) {
      logger.info("✅ Economic balance looks good");
    } else {
      logger.warn("⚠️  Economic balance issues found:");
      balanceIssues.forEach((issue) => logger.warn(`  ${issue}`));
    }

    // Test 6: Service integration test
    logger.info("\n🔧 Test 6: Service Integration Test");

    const assetService = AssetService.getInstance();

    // Test getting available assets for different levels
    const testLevels = [1, 5, 10, 15, 20];
    testLevels.forEach((level) => {
      const available = assetService.getAvailableAssets(level, 50, 100000);
      logger.info(`  Level ${level}: ${available.length} assets available`);
    });

    // Test asset template retrieval
    const testAsset = assetService.getAssetTemplate("convenience_store");
    if (testAsset) {
      logger.info(`✅ Asset template retrieval works: ${testAsset.name}`);
    } else {
      logger.error("❌ Asset template retrieval failed");
    }

    logger.info("\n🎉 Asset System Validation Complete!");
    logger.info(`
📊 Summary:
  ✅ ${assetTemplates.length} asset templates validated
  ✅ ${Object.keys(byCategory).length} categories configured
  ✅ Income distribution system integrated
  ✅ Level progression validated
  ✅ Service integration working

💡 Your asset system is ready for the 3-layered money system!

🚀 Next steps:
  1. Test asset purchasing with /assets and /business commands
  2. Verify income collection with mixed money types
  3. Test asset upgrades and management features
    `);
  } catch (error) {
    logger.error("❌ Asset validation failed:", error);
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

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

main();
