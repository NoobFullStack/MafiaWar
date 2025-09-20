/**
 * CRIME SYSTEM DEMO
 *
 * Test script to demonstrate the crime execution system
 */

import { LevelCalculator } from "../src/config/economy";
import { CrimeService } from "../src/services/CrimeService";
import DatabaseManager from "../src/utils/DatabaseManager";

async function demonstrateCrimeSystem() {
  console.log("🎯 CRIME SYSTEM DEMONSTRATION");
  console.log("================================");

  try {
    // Connect to database
    await DatabaseManager.connect();

    // Test crime data retrieval
    console.log("\n1. 📋 Available Crimes by Level:");
    console.log("--------------------------------");

    for (let level = 1; level <= 5; level++) {
      const crimes = CrimeService.getAvailableCrimes(level);
      console.log(`Level ${level}: ${crimes.length} crimes available`);
      crimes.forEach((crime) => {
        console.log(
          `  - ${crime.name} (Difficulty: ${crime.difficulty}, Reward: $${crime.rewardMin}-${crime.rewardMax})`
        );
      });
    }

    console.log("\n2. 🎲 Crime Success Rate Calculation:");
    console.log("-------------------------------------");

    const testCrime = CrimeService.getCrimeById("pickpocket");
    if (testCrime) {
      const playerStats = { strength: 15, stealth: 20, intelligence: 10 };
      const successRate = CrimeService.calculateSuccessRate(
        testCrime,
        playerStats,
        3
      );
      console.log(
        `${testCrime.name} success rate for Level 3 player: ${(
          successRate * 100
        ).toFixed(1)}%`
      );
      console.log(
        `Base rate: ${
          testCrime.baseSuccessRate * 100
        }%, with stat bonuses applied`
      );
    }

    console.log("\n3. 📊 XP Progression Analysis:");
    console.log("------------------------------");

    // Show XP requirements for early levels
    for (let level = 1; level <= 10; level++) {
      const xpRequired = LevelCalculator.getXPRequiredForLevel(level);
      const totalXP = LevelCalculator.getTotalXPForLevel(level);
      console.log(`Level ${level}: Need ${xpRequired} XP (Total: ${totalXP})`);
    }

    console.log("\n4. 🏛️ Level Gating Examples:");
    console.log("-----------------------------");

    const allCrimes = CrimeService.getAvailableCrimes(50);
    allCrimes.forEach((crime) => {
      const levelReq = crime.requirements?.level || 1;
      if (levelReq > 1) {
        console.log(
          `${crime.name}: Requires Level ${levelReq} (${crime.category})`
        );
      }
    });

    console.log("\n5. 💡 Crime Simulation (Theoretical):");
    console.log("-------------------------------------");

    // Simulate crime attempts without database writes
    const simulateCrime = (crimeId: string, playerLevel: number) => {
      const crime = CrimeService.getCrimeById(crimeId);
      if (!crime) return;

      const playerStats = {
        strength: 10 + playerLevel * 2,
        stealth: 10 + playerLevel * 2,
        intelligence: 10 + playerLevel * 2,
      };

      const successRate = CrimeService.calculateSuccessRate(
        crime,
        playerStats,
        playerLevel
      );
      const avgReward = (crime.rewardMin + crime.rewardMax) / 2;

      console.log(`${crime.name} (Level ${playerLevel}):`);
      console.log(`  Success Rate: ${(successRate * 100).toFixed(1)}%`);
      console.log(
        `  Expected Value: $${(avgReward * successRate).toFixed(0)} per attempt`
      );
      console.log(`  XP Reward: ${crime.xpReward} XP`);
    };

    simulateCrime("pickpocket", 1);
    simulateCrime("car_theft", 5);
    simulateCrime("bank_robbery", 15);

    console.log("\n✅ Crime system demonstration complete!");
    console.log("\n🎮 Ready to use in Discord:");
    console.log("- /crime <type> - Commit a crime");
    console.log("- /help crimes - View available crimes");
  } catch (error) {
    console.error("❌ Error in crime system demo:", error);
  } finally {
    await DatabaseManager.disconnect();
  }
}

// Run the demonstration
demonstrateCrimeSystem().catch(console.error);
