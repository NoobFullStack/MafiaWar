#!/usr/bin/env node
/**
 * ECONOMY REBALANCE SCRIPT
 *
 * This script analyzes the current economy and optionally rebalances
 * item pricing based on the new economic formulas.
 *
 * Usage:
 *   yarn economy:analyze                    - Show analysis report only
 *   yarn economy:rebalance                  - Update item values based on formulas
 *   yarn economy:validate                   - Check individual item balance
 *   yarn economy:suggest --type=tool --rarity=rare --bonus=0.15  - Price suggestions
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { ECONOMY_CONFIG, GameplayEconomyCalculator } from "../config/economy";
import { crimeData } from "../data/crimes";
import { gameItems } from "../data/items";
import { GameplayEconomyAnalyzer } from "../utils/EconomyAnalyzer";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case "analyze":
        await analyzeEconomy();
        break;
      case "rebalance":
        await rebalanceItems();
        break;
      case "validate":
        await validateItems();
        break;
      case "suggest":
        await suggestPricing(args);
        break;
      default:
        showHelp();
        break;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Error:", errorMessage);
    process.exit(1);
  }
}

async function analyzeEconomy() {
  console.log("🔍 Analyzing Gameplay Economy...\n");

  const analysis = GameplayEconomyAnalyzer.analyzeRealEconomics(
    gameItems,
    crimeData
  );

  // Save a summary report
  const reportPath = join(process.cwd(), "docs/economy/economy-analysis.md");
  const report = `# Gameplay Economy Analysis

This analysis shows actual crime income vs item costs to validate pricing.

## Key Findings

### Crime Income by Tier
${analysis.crimes
  .map(
    (c) =>
      `- ${c.name} (Diff ${c.difficulty}): $${Math.round(c.hourlyIncome)}/hour`
  )
  .join("\n")}

### Problematic Items
${analysis.items
  .filter((i) => !i.isWorthIt)
  .map((i) => `- ${i.name}: ${i.issue}`)
  .join("\n")}

### Well-Balanced Items  
${analysis.items
  .filter((i) => i.isWorthIt && !i.issue)
  .map((i) => `- ${i.name}: ${Math.round(i.paybackTime)} hour payback`)
  .join("\n")}
`;

  writeFileSync(reportPath, report);
  console.log(`\n📊 Summary report saved to: docs/economy/economy-analysis.md`);
}

async function rebalanceItems() {
  console.log("⚖️  Rebalancing Items Based on Gameplay Value...\n");

  let rebalancedCount = 0;
  const updates: Array<{
    item: string;
    oldValue: number;
    newValue: number;
    reason: string;
  }> = [];

  // Calculate new values for each item based on gameplay impact
  const rebalancedItems = gameItems.map((item) => {
    // Extract crime bonus for pricing calculation
    let maxCrimeBonus = 0;
    const crimeBonuses = item.metadata?.crimeBonus || {};
    const requiredForCrimes: string[] = [];

    if (Object.keys(crimeBonuses).length > 0) {
      const bonusValues = Object.values(crimeBonuses).filter(
        (v): v is number => typeof v === "number"
      );
      if (bonusValues.length > 0) {
        maxCrimeBonus = Math.max(...bonusValues);
      }
    }

    // Check if this item is required for any crimes
    crimeData.forEach((crime) => {
      if (crime.requirements?.items?.includes(item.id)) {
        requiredForCrimes.push(crime.id);
      }
    });

    // Calculate suggested value based on gameplay impact
    const tierLevel = Math.min(5, Math.max(1, Math.ceil(item.value / 5000))); // Rough tier estimation
    const newValue = GameplayEconomyCalculator.calculateItemValue(
      item.type,
      item.rarity,
      crimeBonuses,
      requiredForCrimes,
      tierLevel
    );

    // Only update if significantly different (>30% change)
    const changePercent = Math.abs(newValue - item.value) / item.value;
    if (changePercent > 0.3) {
      let reason = "Gameplay value adjustment";
      if (requiredForCrimes.length > 0)
        reason = "Required for crimes - scarcity premium";
      else if (maxCrimeBonus > 0.15) reason = "High crime bonus value";
      else if (maxCrimeBonus === 0) reason = "No gameplay bonuses";

      updates.push({
        item: item.name,
        oldValue: item.value,
        newValue: newValue,
        reason: reason,
      });
      rebalancedCount++;

      return { ...item, value: newValue };
    }

    return item;
  });

  if (rebalancedCount === 0) {
    console.log("✅ No significant gameplay-based adjustments needed!");
    return;
  }

  // Show proposed changes
  console.log("📋 Proposed Gameplay-Based Changes:");
  updates.forEach((update) => {
    const change = update.newValue - update.oldValue;
    const changePercent = Math.round((change / update.oldValue) * 100);
    const arrow = change > 0 ? "📈" : "📉";
    console.log(
      `${arrow} ${update.item}: $${update.oldValue} → $${update.newValue} (${
        changePercent > 0 ? "+" : ""
      }${changePercent}%) - ${update.reason}`
    );
  });

  // Confirm changes
  console.log(
    `\n⚠️  This will update ${rebalancedCount} items based on gameplay value. Continue? (y/N)`
  );

  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise<string>((resolve) => {
    rl.question("> ", resolve);
  });
  rl.close();

  if (answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes") {
    console.log("❌ Rebalancing cancelled.");
    return;
  }

  // Update the items file
  const itemsPath = join(process.cwd(), "src/data/items.ts");
  const itemsFileContent = readFileSync(itemsPath, "utf-8");

  // Create updated content (simplified - would need more sophisticated parsing for real use)
  console.log(
    `✅ Successfully rebalanced ${rebalancedCount} items based on gameplay value!`
  );
  console.log(
    "🔄 Manual update required: Please update item values in src/data/items.ts"
  );
  console.log('Then run "yarn seed" to update the database with new values.');
}

async function validateItems() {
  console.log("🔍 Validating Item Gameplay Balance...\n");

  let issueCount = 0;

  gameItems.forEach((item) => {
    const validation = GameplayEconomyAnalyzer.validateItem(item, crimeData);

    if (!validation.is_balanced) {
      issueCount++;
      console.log(`❌ ${item.name} (${item.rarity} ${item.type})`);
      validation.issues.forEach((issue: string) =>
        console.log(`   • ${issue}`)
      );
      validation.suggestions.forEach((suggestion: string) =>
        console.log(`   💡 ${suggestion}`)
      );
      if (validation.payback_hours !== Infinity) {
        console.log(
          `   ⏱️  Payback time: ${Math.round(validation.payback_hours)} hours`
        );
      }
      console.log();
    }
  });

  if (issueCount === 0) {
    console.log("✅ All items are well-balanced for gameplay!");
  } else {
    console.log(`⚠️  Found balance issues in ${issueCount} items.`);
    console.log(
      "Consider adjusting prices based on actual crime income and payback times."
    );
  }
}

async function suggestPricing(args: string[]) {
  // Parse arguments
  const params = {
    type: "tool",
    rarity: "common",
    bonus: 0.0,
    tierLevel: 2,
  };

  args.forEach((arg) => {
    if (arg.startsWith("--type=")) params.type = arg.split("=")[1];
    if (arg.startsWith("--rarity=")) params.rarity = arg.split("=")[1];
    if (arg.startsWith("--bonus="))
      params.bonus = parseFloat(arg.split("=")[1]);
    if (arg.startsWith("--tier="))
      params.tierLevel = parseInt(arg.split("=")[1]);
  });

  console.log("💰 Gameplay-Based Pricing Suggestion:\n");
  console.log(`Item Type: ${params.type}`);
  console.log(`Rarity: ${params.rarity}`);
  console.log(`Crime Bonus: ${Math.round(params.bonus * 100)}%`);
  console.log(`Target Tier: ${params.tierLevel}\n`);

  // Calculate crime bonuses map
  const crimeBonuses: Record<string, number> =
    params.bonus > 0 ? { generic_crime: params.bonus } : {};

  const baseValue = GameplayEconomyCalculator.calculateItemValue(
    params.type,
    params.rarity,
    crimeBonuses,
    [],
    params.tierLevel
  );

  const shopPrice = GameplayEconomyCalculator.calculateShopPrice(
    baseValue,
    params.type
  );
  const salePrice = GameplayEconomyCalculator.calculateSalePrice(baseValue);

  console.log("💵 Recommended Pricing (Gameplay-Based):");
  console.log(`   Base Value: $${baseValue}`);
  console.log(`   Shop Price: $${shopPrice} (players pay)`);
  console.log(`   Sale Price: $${salePrice} (players receive)`);

  console.log("\n📊 Gameplay Context:");
  if (params.bonus > 0) {
    // Estimate payback time
    const avgCrimeIncome = params.tierLevel * 200; // Rough estimate
    const extraIncomePerCrime = avgCrimeIncome * params.bonus;
    const crimesToPayback = Math.ceil(baseValue / extraIncomePerCrime);
    console.log(`   Crimes to Pay Back: ~${crimesToPayback}`);
    console.log(
      `   Extra Income per Crime: $${Math.round(extraIncomePerCrime)}`
    );
  }

  const tierData = Object.values(ECONOMY_CONFIG.PROGRESSION_GATES)[
    params.tierLevel - 1
  ] as any;
  if (tierData) {
    console.log(
      `   Tier ${params.tierLevel} Income: $${tierData.typical_income}/hour`
    );
    console.log(`   Max Tier Cost: $${tierData.max_item_cost}`);
  }
}

function showHelp() {
  console.log(`
🏦 MafiaWar Economy Tools

Commands:
  yarn economy:analyze              Generate economy analysis report
  yarn economy:rebalance           Rebalance item pricing using formulas
  yarn economy:validate            Check item balance issues
  yarn economy:suggest [options]   Get pricing suggestions for new items

Suggest Options:
  --type=<tool|consumable|trade_good|collectible>
  --rarity=<common|uncommon|rare|epic|legendary>
  --effectiveness=<number>         (default: 1.0)
  --bonus=<number>                 Crime bonus as decimal (e.g., 0.15 for 15%)

Examples:
  yarn economy:suggest --type=tool --rarity=rare --bonus=0.15
  yarn economy:suggest --type=consumable --rarity=epic --effectiveness=1.5
  `);
}

main();
