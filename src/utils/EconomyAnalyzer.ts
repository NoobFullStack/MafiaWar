/**
 * GAMEPLAY ECONOMY ANALYZER
 * 
 * Shows REAL crime income vs item costs to validate pricing makes sense
 * for actual MafiaWar gameplay economics.
 */

import type { GameItem } from '../data/items';
import type { CrimeData } from '../data/crimes';

interface CrimeIncomeData {
  id: string;
  name: string;
  difficulty: number;
  avgReward: number;
  successRate: number;
  cooldown: number;
  hourlyIncome: number;
  expectedIncome: number; // reward * success rate
}

interface ItemAnalysis {
  name: string;
  cost: number;
  type: string;
  rarity: string;
  crimeBonuses: Record<string, number>;
  affectedCrimes: string[];
  paybackTime: number; // hours to pay for itself
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
   * Calculate actual income rates from crimes
   */
  private static analyzeCrimeIncome(crimes: CrimeData[]): CrimeIncomeData[] {
    return crimes.map(crime => {
      const avgReward = (crime.rewardMin + crime.rewardMax) / 2;
      const expectedIncome = avgReward * crime.baseSuccessRate;
      const crimesPerHour = 3600 / crime.cooldown;
      const hourlyIncome = expectedIncome * crimesPerHour;
      
      return {
        id: crime.id,
        name: crime.name,
        difficulty: crime.difficulty,
        avgReward,
        successRate: crime.baseSuccessRate,
        cooldown: crime.cooldown,
        expectedIncome,
        hourlyIncome,
      };
    }).sort((a, b) => a.difficulty - b.difficulty);
  }
  
  /**
   * Analyze item value vs their actual gameplay impact
   */
  private static analyzeItemValue(items: GameItem[], crimes: CrimeData[]): ItemAnalysis[] {
    const crimeMap = new Map(crimes.map(c => [c.id, c]));
    
    return items.map(item => {
      const crimeBonuses = item.metadata?.crimeBonus || {};
      const affectedCrimes = Object.keys(crimeBonuses);
      
      // Calculate how long it takes to pay for itself
      let paybackTime = Infinity;
      let totalExtraIncome = 0;
      let affectedCrimeCount = 0;
      
      affectedCrimes.forEach(crimeId => {
        const crime = crimeMap.get(crimeId);
        if (crime) {
          const bonus = crimeBonuses[crimeId];
          const avgReward = (crime.rewardMin + crime.rewardMax) / 2;
          const baseExpectedIncome = avgReward * crime.baseSuccessRate;
          const newExpectedIncome = avgReward * Math.min(0.95, crime.baseSuccessRate + bonus);
          const extraIncomePerCrime = newExpectedIncome - baseExpectedIncome;
          
          const crimesPerHour = 3600 / crime.cooldown;
          const extraIncomePerHour = extraIncomePerCrime * crimesPerHour;
          
          totalExtraIncome += extraIncomePerHour;
          affectedCrimeCount++;
        }
      });
      
      if (totalExtraIncome > 0) {
        paybackTime = item.value / totalExtraIncome;
      }
      
      // Determine if item is worth it
      let isWorthIt = true;
      let issue: string | undefined;
      
      if (affectedCrimes.length === 0 && item.type === 'tool') {
        isWorthIt = false;
        issue = "No gameplay benefit - tool with no crime bonuses";
      } else if (paybackTime > 10) {
        isWorthIt = false;
        issue = `Takes ${Math.round(paybackTime)} hours to pay for itself - too expensive`;
      } else if (paybackTime < 0.5) {
        issue = `Pays for itself in ${Math.round(paybackTime * 60)} minutes - may be too cheap`;
      }
      
      return {
        name: item.name,
        cost: item.value,
        type: item.type,
        rarity: item.rarity,
        crimeBonuses,
        affectedCrimes,
        paybackTime,
        isWorthIt,
        issue,
      };
    });
  }
  
  /**
   * Display crime income analysis
   */
  private static displayCrimeIncome(crimes: CrimeIncomeData[]) {
    console.log("\n💰 CRIME INCOME ANALYSIS:");
    console.log("-".repeat(80));
    console.log("Crime                    | Diff | Reward  | Success | Income/Hour | Expected/Crime");
    console.log("-".repeat(80));
    
    crimes.forEach(crime => {
      const name = crime.name.padEnd(24);
      const diff = crime.difficulty.toString().padStart(2);
      const reward = `$${Math.round(crime.avgReward)}`.padStart(7);
      const success = `${Math.round(crime.successRate * 100)}%`.padStart(7);
      const hourly = `$${Math.round(crime.hourlyIncome)}`.padStart(10);
      const expected = `$${Math.round(crime.expectedIncome)}`.padStart(13);
      
      console.log(`${name} |  ${diff}  | ${reward} | ${success} | ${hourly} | ${expected}`);
    });
    
    // Show tier income summary
    console.log("\n📊 INCOME BY TIER:");
    const tiers = [
      { name: "Beginner (1-2)", crimes: crimes.filter(c => c.difficulty >= 1 && c.difficulty <= 2) },
      { name: "Amateur (3-4)", crimes: crimes.filter(c => c.difficulty >= 3 && c.difficulty <= 4) },
      { name: "Professional (5-6)", crimes: crimes.filter(c => c.difficulty >= 5 && c.difficulty <= 6) },
      { name: "Expert (7-8)", crimes: crimes.filter(c => c.difficulty >= 7 && c.difficulty <= 8) },
      { name: "Master (9-10)", crimes: crimes.filter(c => c.difficulty >= 9 && c.difficulty <= 10) },
    ];
    
    tiers.forEach(tier => {
      if (tier.crimes.length > 0) {
        const avgIncome = tier.crimes.reduce((sum, c) => sum + c.hourlyIncome, 0) / tier.crimes.length;
        console.log(`${tier.name.padEnd(20)}: $${Math.round(avgIncome)}/hour average`);
      }
    });
  }
  
  /**
   * Display item value analysis
   */
  private static displayItemAnalysis(items: ItemAnalysis[]) {
    console.log("\n🛠️  ITEM VALUE ANALYSIS:");
    console.log("-".repeat(90));
    console.log("Item                     | Cost    | Payback | Affected Crimes    | Status");
    console.log("-".repeat(90));
    
    items.forEach(item => {
      const name = item.name.padEnd(24);
      const cost = `$${item.cost}`.padStart(8);
      const payback = item.paybackTime === Infinity 
        ? "   Never".padStart(8)
        : item.paybackTime < 1 
        ? `${Math.round(item.paybackTime * 60)}min`.padStart(8)
        : `${Math.round(item.paybackTime)}hr`.padStart(8);
      const crimes = item.affectedCrimes.length > 0 
        ? item.affectedCrimes.slice(0, 2).join(', ')
        : "None";
      const crimesField = crimes.padEnd(18);
      
      const status = item.isWorthIt ? "✅ Good" : "❌ Issue";
      
      console.log(`${name} | ${cost} | ${payback} | ${crimesField} | ${status}`);
      
      if (item.issue) {
        console.log(`${"".padEnd(24)} | ${"".padEnd(8)} | ${"".padEnd(8)} | ${"".padEnd(18)} | 💡 ${item.issue}`);
      }
    });
  }
  
  /**
   * Display overall economy health
   */
  private static displayEconomyHealth(crimes: CrimeIncomeData[], items: ItemAnalysis[]) {
    console.log("\n🏥 ECONOMY HEALTH CHECK:");
    console.log("-".repeat(50));
    
    // Check crime progression
    const progressionIssues: string[] = [];
    for (let i = 1; i < crimes.length; i++) {
      const prev = crimes[i - 1];
      const curr = crimes[i];
      const incomeIncrease = curr.hourlyIncome / prev.hourlyIncome;
      
      if (incomeIncrease < 1.3) {
        progressionIssues.push(`Difficulty ${curr.difficulty} only ${Math.round(incomeIncrease * 100)}% income of ${prev.difficulty}`);
      }
    }
    
    // Check item balance
    const problematicItems = items.filter(item => !item.isWorthIt);
    const tooExpensive = items.filter(item => item.paybackTime > 5);
    const tooCheap = items.filter(item => item.paybackTime < 1 && item.paybackTime !== Infinity);
    
    console.log(`Crime Progression Issues: ${progressionIssues.length}`);
    progressionIssues.forEach(issue => console.log(`  ⚠️  ${issue}`));
    
    console.log(`\nItem Balance Issues: ${problematicItems.length}`);
    console.log(`  Too Expensive (>5hr payback): ${tooExpensive.length}`);
    console.log(`  Too Cheap (<1hr payback): ${tooCheap.length}`);
    console.log(`  No Gameplay Value: ${items.filter(i => i.affectedCrimes.length === 0 && i.type === 'tool').length}`);
    
    // Show recommended fixes
    console.log("\n💡 RECOMMENDATIONS:");
    if (tooExpensive.length > 0) {
      console.log("📉 Reduce prices on expensive items:");
      tooExpensive.slice(0, 3).forEach(item => {
        const suggestedPrice = Math.round(item.cost * 0.3); // Make it pay back in ~1.5 hours
        console.log(`  ${item.name}: $${item.cost} → $${suggestedPrice}`);
      });
    }
    
    if (tooCheap.length > 0) {
      console.log("📈 Increase prices on cheap items:");
      tooCheap.slice(0, 3).forEach(item => {
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
      suggestions: analysis.issue ? [`Consider adjusting price based on ${Math.round(analysis.paybackTime)}hr payback time`] : [],
      payback_hours: analysis.paybackTime,
    };
  }
}

// Legacy compatibility exports
export const EconomyAnalyzer = GameplayEconomyAnalyzer;
export const validateItemBalance = GameplayEconomyAnalyzer.validateItem;
