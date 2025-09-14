/**
 * GAMEPLAY ECONOMY ANALYZER
 *
 * Shows REAL crime income vs item costs to validate pricing makes sense
 * for actual MafiaWar gameplay economics, including XP progression and level gating.
 */

import { LevelCalculator } from "../config/economy";
import type { CrimeData } from "../data/crimes";
import type { GameItem } from "../data/items";

interface CrimeIncomeData {
  id: string;
  name: string;
  difficulty: number;
  avgReward: number;
  xpReward: number;
  successRate: number;
  cooldown: number;
  hourlyIncome: number;
  hourlyXP: number;
  expectedIncome: number; // reward * success rate
  expectedXP: number; // xp * success rate
}

interface ItemAnalysis {
  name: string;
  cost: number;
  type: string;
  rarity: string;
  levelRequirement?: number;
  crimeBonuses: Record<string, number>;
  affectedCrimes: string[];
  paybackTime: number; // hours to pay for itself (money only)
  paybackTimeWithXP: number; // hours including XP value
  isWorthIt: boolean;
  issue?: string;
}

export class GameplayEconomyAnalyzer {
  /**
   * Analyze REAL gameplay economics - crime income vs item costs
   */
  static analyzeRealEconomics(items: GameItem[], crimes: CrimeData[]) {
    console.log("=".repeat(60));
    console.log("🎮 REAL MAFIA GAME ECONOMICS ANALYSIS");
    console.log("=".repeat(60));

    // First, show actual crime income rates
    const crimeAnalysis = this.analyzeCrimeIncome(crimes);
    this.displayCrimeIncome(crimeAnalysis);

    // Show XP progression and level system
    this.displayLevelProgression(crimeAnalysis);

    // Then show item cost vs value analysis
    const itemAnalysis = this.analyzeItemValue(items, crimes);
    this.displayItemAnalysis(itemAnalysis);

    // Show overall economy health
    this.displayEconomyHealth(crimeAnalysis, itemAnalysis);

    return {
      crimes: crimeAnalysis,
      items: itemAnalysis,
    };
  }

  /**
   * Calculate actual income rates from crimes including XP value
   */
  private static analyzeCrimeIncome(crimes: CrimeData[]): CrimeIncomeData[] {
    return crimes
      .map((crime) => {
        const avgReward = (crime.rewardMin + crime.rewardMax) / 2;
        const expectedIncome = avgReward * crime.baseSuccessRate;
        const expectedXP = crime.xpReward * crime.baseSuccessRate;
        const crimesPerHour = 3600 / crime.cooldown;
        const hourlyIncome = expectedIncome * crimesPerHour;
        const hourlyXP = expectedXP * crimesPerHour;

        return {
          id: crime.id,
          name: crime.name,
          difficulty: crime.difficulty,
          avgReward,
          xpReward: crime.xpReward,
          successRate: crime.baseSuccessRate,
          cooldown: crime.cooldown,
          expectedIncome,
          expectedXP,
          hourlyIncome,
          hourlyXP,
        };
      })
      .sort((a, b) => a.difficulty - b.difficulty);
  }

  /**
   * Analyze item value vs their actual gameplay impact including XP
   */
  private static analyzeItemValue(
    items: GameItem[],
    crimes: CrimeData[]
  ): ItemAnalysis[] {
    const crimeMap = new Map(crimes.map((c) => [c.id, c]));

    return items.map((item) => {
      const crimeBonuses = item.metadata?.crimeBonus || {};
      const levelRequirement = item.metadata?.levelRequirement;

      // Handle different item types
      let affectedCrimes: string[] = [];
      let totalExtraIncome = 0;
      let totalExtraXP = 0;
      let paybackTime = Infinity;
      let paybackTimeWithXP = Infinity;

      if (item.type === "tool") {
        // Tools provide permanent crime bonuses
        affectedCrimes = Object.keys(crimeBonuses);

        affectedCrimes.forEach((crimeId) => {
          const crime = crimeMap.get(crimeId);
          if (crime) {
            const bonus = crimeBonuses[crimeId];
            const avgReward = (crime.rewardMin + crime.rewardMax) / 2;
            const baseExpectedIncome = avgReward * crime.baseSuccessRate;
            const baseExpectedXP = crime.xpReward * crime.baseSuccessRate;

            const newExpectedIncome =
              avgReward * Math.min(0.95, crime.baseSuccessRate + bonus);
            const newExpectedXP =
              crime.xpReward * Math.min(0.95, crime.baseSuccessRate + bonus);

            const extraIncomePerCrime = newExpectedIncome - baseExpectedIncome;
            const extraXPPerCrime = newExpectedXP - baseExpectedXP;

            const crimesPerHour = 3600 / crime.cooldown;
            const extraIncomePerHour = extraIncomePerCrime * crimesPerHour;
            const extraXPPerHour = extraXPPerCrime * crimesPerHour;

            totalExtraIncome += extraIncomePerHour;
            totalExtraXP += extraXPPerHour;
          }
        });
      } else if (item.type === "consumable") {
        // Consumables provide temporary bonuses
        const allCrimesBonus = crimeBonuses.all_crimes || 0;
        const durationMinutes = crimeBonuses.duration_minutes || 0;

        if (allCrimesBonus > 0 && durationMinutes > 0) {
          affectedCrimes = ["all_crimes"];

          // Calculate benefit from ALL crimes during the duration
          crimes.forEach((crime) => {
            const avgReward = (crime.rewardMin + crime.rewardMax) / 2;
            const baseExpectedIncome = avgReward * crime.baseSuccessRate;
            const baseExpectedXP = crime.xpReward * crime.baseSuccessRate;

            const newExpectedIncome =
              avgReward *
              Math.min(0.95, crime.baseSuccessRate + allCrimesBonus);
            const newExpectedXP =
              crime.xpReward *
              Math.min(0.95, crime.baseSuccessRate + allCrimesBonus);

            const extraIncomePerCrime = newExpectedIncome - baseExpectedIncome;
            const extraXPPerCrime = newExpectedXP - baseExpectedXP;

            // How many of this crime can they do during the consumable duration?
            const crimesInDuration = Math.floor(
              (durationMinutes * 60) / crime.cooldown
            );

            totalExtraIncome += extraIncomePerCrime * crimesInDuration;
            totalExtraXP += extraXPPerCrime * crimesInDuration;
          });

          // For payback calculation, assume they use one consumable per hour of play
          // So divide the total benefit by how many consumables they'd need per hour
          const usagePerHour = 60 / durationMinutes; // How many consumables per hour
          totalExtraIncome = totalExtraIncome / usagePerHour;
          totalExtraXP = totalExtraXP / usagePerHour;
        }
      } else if (item.type === "trade_good") {
        // Trade goods have value from selling, not crime bonuses
        const smugglingValue = item.metadata?.smuggling_value || 0;
        const fenceValue = item.metadata?.fence_value || 0;
        const maxSellValue = Math.max(smugglingValue, fenceValue);

        if (maxSellValue > item.value) {
          // Profit from selling
          const profit = maxSellValue - item.value;
          // Assume they can trade once per day (24 hours)
          totalExtraIncome = profit / 24;
          affectedCrimes = ["trading"];
        }
      } else if (item.type === "collectible") {
        // Collectibles are for prestige/reputation, not direct income
        affectedCrimes = ["prestige"];
        // Don't calculate payback - these are luxury items
      }

      // Calculate payback time (money only)
      if (totalExtraIncome > 0) {
        paybackTime = item.value / totalExtraIncome;
      }

      // Calculate payback time including XP value
      if (totalExtraIncome > 0 || totalExtraXP > 0) {
        // Assume player is mid-level for XP valuation
        const xpValue = LevelCalculator.getXPEconomicValue(15);
        const totalExtraValue = totalExtraIncome + totalExtraXP * xpValue;
        paybackTimeWithXP = item.value / totalExtraValue;
      }

      // Determine if item is worth it
      let isWorthIt = true;
      let issue: string | undefined;

      if (item.type === "tool" && affectedCrimes.length === 0) {
        isWorthIt = false;
        issue = "No gameplay benefit - tool with no crime bonuses";
      } else if (item.type === "collectible") {
        // Collectibles are luxury items - they don't need to "pay for themselves"
        isWorthIt = true;
      } else if (item.type === "trade_good" && totalExtraIncome <= 0) {
        isWorthIt = false;
        issue = "No profit from trading - check smuggling/fence values";
      } else if (paybackTimeWithXP > 10) {
        isWorthIt = false;
        issue = `Takes ${Math.round(
          paybackTimeWithXP
        )} hours to pay for itself - too expensive`;
      } else if (paybackTimeWithXP < 0.5 && item.type !== "consumable") {
        issue = `Pays for itself in ${Math.round(
          paybackTimeWithXP * 60
        )} minutes - may be too cheap`;
      }

      return {
        name: item.name,
        cost: item.value,
        type: item.type,
        rarity: item.rarity,
        levelRequirement,
        crimeBonuses,
        affectedCrimes,
        paybackTime,
        paybackTimeWithXP,
        isWorthIt,
        issue,
      };
    });
  }

  /**
   * Display XP progression and leveling analysis
   */
  private static displayLevelProgression(crimes: CrimeIncomeData[]) {
    console.log("\n🎯 XP PROGRESSION & LEVEL ANALYSIS:");
    console.log("-".repeat(70));

    // Show time to reach key level milestones
    const keyLevels = [5, 10, 15, 20, 25, 30];
    const avgXPPerHour =
      crimes.reduce((sum, c) => sum + c.hourlyXP, 0) / crimes.length;

    console.log("Level Milestone Progression (Mixed Crime Activities):");
    console.log("-".repeat(70));
    keyLevels.forEach((level) => {
      const totalXPNeeded = LevelCalculator.getTotalXPForLevel(level);
      const hoursNeeded = totalXPNeeded / avgXPPerHour;
      const daysNeeded = hoursNeeded / 24;
      const milestone = LevelCalculator.getLevelMilestone(level);

      console.log(
        `Level ${level.toString().padStart(2)}: ${totalXPNeeded
          .toString()
          .padStart(6)} XP | ${hoursNeeded
          .toFixed(1)
          .padStart(5)}hrs | ${daysNeeded.toFixed(1).padStart(4)} days | ${
          milestone?.title || "No milestone"
        }`
      );
    });

    // Show XP efficiency by crime
    console.log("\n📈 XP EFFICIENCY BY CRIME:");
    console.log("-".repeat(50));
    console.log("Crime                    | XP/Hour | Hours to Level 10");
    console.log("-".repeat(50));

    const level10XP = LevelCalculator.getTotalXPForLevel(10);
    crimes.forEach((crime) => {
      const name = crime.name.padEnd(24);
      const xpHour = Math.round(crime.hourlyXP).toString().padStart(7);
      const hoursTo10 = (level10XP / crime.hourlyXP).toFixed(1).padStart(13);
      console.log(`${name} | ${xpHour} | ${hoursTo10}`);
    });
  }
  private static displayCrimeIncome(crimes: CrimeIncomeData[]) {
    console.log("\n💰 CRIME INCOME & XP ANALYSIS:");
    console.log("-".repeat(95));
    console.log(
      "Crime                    | Diff | Reward  | XP | Success | Income/Hour | XP/Hour"
    );
    console.log("-".repeat(95));

    crimes.forEach((crime) => {
      const name = crime.name.padEnd(24);
      const diff = crime.difficulty.toString().padStart(2);
      const reward = `$${Math.round(crime.avgReward)}`.padStart(7);
      const xp = Math.round(crime.xpReward).toString().padStart(2);
      const success = `${Math.round(crime.successRate * 100)}%`.padStart(7);
      const hourly = `$${Math.round(crime.hourlyIncome)}`.padStart(10);
      const hourlyXp = `${Math.round(crime.hourlyXP)}`.padStart(6);

      console.log(
        `${name} |  ${diff}  | ${reward} | ${xp} | ${success} | ${hourly} | ${hourlyXp}`
      );
    });

    // Show tier income summary including XP
    console.log("\n📊 INCOME & XP BY TIER:");
    const tiers = [
      {
        name: "Beginner (1-2)",
        crimes: crimes.filter((c) => c.difficulty >= 1 && c.difficulty <= 2),
      },
      {
        name: "Amateur (3-4)",
        crimes: crimes.filter((c) => c.difficulty >= 3 && c.difficulty <= 4),
      },
      {
        name: "Professional (5-6)",
        crimes: crimes.filter((c) => c.difficulty >= 5 && c.difficulty <= 6),
      },
      {
        name: "Expert (7-8)",
        crimes: crimes.filter((c) => c.difficulty >= 7 && c.difficulty <= 8),
      },
      {
        name: "Master (9-10)",
        crimes: crimes.filter((c) => c.difficulty >= 9 && c.difficulty <= 10),
      },
    ];

    tiers.forEach((tier) => {
      if (tier.crimes.length > 0) {
        const avgIncome =
          tier.crimes.reduce((sum, c) => sum + c.hourlyIncome, 0) /
          tier.crimes.length;
        const avgXP =
          tier.crimes.reduce((sum, c) => sum + c.hourlyXP, 0) /
          tier.crimes.length;
        console.log(
          `${tier.name.padEnd(20)}: $${Math.round(
            avgIncome
          )}/hour, ${Math.round(avgXP)} XP/hour`
        );
      }
    });
  }

  /**
   * Display item value analysis
   */
  private static displayItemAnalysis(items: ItemAnalysis[]) {
    console.log("\n🛠️  ITEM VALUE ANALYSIS:");
    console.log("-".repeat(90));
    console.log(
      "Item                     | Cost    | Payback | Affected Crimes    | Status"
    );
    console.log("-".repeat(90));

    items.forEach((item) => {
      const name = item.name.padEnd(24);
      const cost = `$${item.cost}`.padStart(8);
      const payback =
        item.paybackTime === Infinity
          ? "   Never".padStart(8)
          : item.paybackTime < 1
          ? `${Math.round(item.paybackTime * 60)}min`.padStart(8)
          : `${Math.round(item.paybackTime)}hr`.padStart(8);
      const crimes =
        item.affectedCrimes.length > 0
          ? item.affectedCrimes.slice(0, 2).join(", ")
          : "None";
      const crimesField = crimes.padEnd(18);

      const status = item.isWorthIt ? "✅ Good" : "❌ Issue";

      console.log(
        `${name} | ${cost} | ${payback} | ${crimesField} | ${status}`
      );

      if (item.issue) {
        console.log(
          `${"".padEnd(24)} | ${"".padEnd(8)} | ${"".padEnd(8)} | ${"".padEnd(
            18
          )} | 💡 ${item.issue}`
        );
      }
    });
  }

  /**
   * Display overall economy health
   */
  private static displayEconomyHealth(
    crimes: CrimeIncomeData[],
    items: ItemAnalysis[]
  ) {
    console.log("\n🏥 ECONOMY HEALTH CHECK:");
    console.log("-".repeat(50));

    // Check crime progression
    const progressionIssues: string[] = [];
    for (let i = 1; i < crimes.length; i++) {
      const prev = crimes[i - 1];
      const curr = crimes[i];
      const incomeIncrease = curr.hourlyIncome / prev.hourlyIncome;

      if (incomeIncrease < 1.3) {
        progressionIssues.push(
          `Difficulty ${curr.difficulty} only ${Math.round(
            incomeIncrease * 100
          )}% income of ${prev.difficulty}`
        );
      }
    }

    // Check item balance
    const problematicItems = items.filter((item) => !item.isWorthIt);
    const tooExpensive = items.filter((item) => item.paybackTime > 5);
    const tooCheap = items.filter(
      (item) => item.paybackTime < 1 && item.paybackTime !== Infinity
    );

    console.log(`Crime Progression Issues: ${progressionIssues.length}`);
    progressionIssues.forEach((issue) => console.log(`  ⚠️  ${issue}`));

    console.log(`\nItem Balance Issues: ${problematicItems.length}`);
    console.log(`  Too Expensive (>5hr payback): ${tooExpensive.length}`);
    console.log(`  Too Cheap (<1hr payback): ${tooCheap.length}`);
    console.log(
      `  No Gameplay Value: ${
        items.filter((i) => i.affectedCrimes.length === 0 && i.type === "tool")
          .length
      }`
    );

    // Show recommended fixes
    console.log("\n💡 RECOMMENDATIONS:");
    if (tooExpensive.length > 0) {
      console.log("📉 Reduce prices on expensive items:");
      tooExpensive.slice(0, 3).forEach((item) => {
        const suggestedPrice = Math.round(item.cost * 0.3); // Make it pay back in ~1.5 hours
        console.log(`  ${item.name}: $${item.cost} → $${suggestedPrice}`);
      });
    }

    if (tooCheap.length > 0) {
      console.log("📈 Increase prices on cheap items:");
      tooCheap.slice(0, 3).forEach((item) => {
        const suggestedPrice = Math.round(item.cost * 3); // Make it pay back in ~3 hours
        console.log(`  ${item.name}: $${item.cost} → $${suggestedPrice}`);
      });
    }

    console.log("\n🎯 IDEAL ECONOMY TARGETS:");
    console.log("  • Items should pay for themselves in 1-5 hours of use");
    console.log("  • Each difficulty tier should provide 50%+ more income");
    console.log("  • Tools should provide meaningful crime bonuses");
    console.log("  • Required items can cost more (scarcity premium)");
  }

  /**
   * Quick validation for individual items
   */
  static validateItem(item: GameItem, crimes: CrimeData[]) {
    const analysis = this.analyzeItemValue([item], crimes)[0];

    return {
      is_balanced: analysis.isWorthIt,
      issues: analysis.issue ? [analysis.issue] : [],
      suggestions: analysis.issue
        ? [
            `Consider adjusting price based on ${Math.round(
              analysis.paybackTime
            )}hr payback time`,
          ]
        : [],
      payback_hours: analysis.paybackTime,
    };
  }
}

// Legacy compatibility exports
export const EconomyAnalyzer = GameplayEconomyAnalyzer;
export const validateItemBalance = GameplayEconomyAnalyzer.validateItem;
