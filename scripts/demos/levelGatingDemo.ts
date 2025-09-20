/**
 * LEVEL GATING DEMONSTRATION SCRIPT
 *
 * Shows how level gating works with items, crimes, and assets
 */

import { LevelCalculator } from "../src/config/economy";
import { assetTemplates } from "../src/data/assets";
import { crimeData } from "../src/data/crimes";
import { gameItems } from "../src/data/items";
import { LevelGateValidator } from "../src/utils/LevelGateValidator";

// Simulate different player levels
const testPlayers = [
  {
    level: 1,
    experience: 0,
    reputation: 0,
    money: 500,
    stats: { strength: 10, stealth: 10, intelligence: 10 },
  },
  {
    level: 5,
    experience: 3574,
    reputation: 10,
    money: 5000,
    stats: { strength: 15, stealth: 15, intelligence: 15 },
  },
  {
    level: 12,
    experience: 32000,
    reputation: 30,
    money: 50000,
    stats: { strength: 25, stealth: 25, intelligence: 30 },
  },
  {
    level: 20,
    experience: 99866,
    reputation: 100,
    money: 200000,
    stats: { strength: 35, stealth: 30, intelligence: 35 },
  },
];

function demonstrateLevelGating() {
  console.log("🔒 LEVEL GATING SYSTEM DEMONSTRATION");
  console.log("=".repeat(60));

  testPlayers.forEach((player, index) => {
    console.log(
      `\n👤 PLAYER ${index + 1} - Level ${player.level} (${
        player.experience
      } XP)`
    );
    console.log("-".repeat(50));

    // Show available items
    const availableItems = LevelGateValidator.getAvailableItems(
      gameItems,
      player
    );
    console.log(
      `\n🛠️  AVAILABLE ITEMS (${availableItems.length}/${gameItems.length}):`
    );
    availableItems.forEach((item) => {
      console.log(`  ✅ ${item.name} (${item.type})`);
    });

    // Show locked items
    const lockedItems = gameItems.filter(
      (item) => !LevelGateValidator.validateItemAccess(item, player).isUnlocked
    );
    if (lockedItems.length > 0) {
      console.log(`\n🔒 LOCKED ITEMS (${lockedItems.length}):`);
      lockedItems.forEach((item) => {
        const validation = LevelGateValidator.validateItemAccess(item, player);
        const message = LevelGateValidator.getUnlockMessage(
          validation,
          player.level
        );
        console.log(`  ${message} ${item.name}`);
      });
    }

    // Show available crimes
    const availableCrimes = LevelGateValidator.getAvailableCrimes(
      crimeData,
      player
    );
    console.log(
      `\n⚡ AVAILABLE CRIMES (${availableCrimes.length}/${crimeData.length}):`
    );
    availableCrimes.forEach((crime) => {
      console.log(`  ✅ ${crime.name} (Difficulty ${crime.difficulty})`);
    });

    // Show locked crimes
    const lockedCrimes = crimeData.filter(
      (crime) =>
        !LevelGateValidator.validateCrimeAccess(crime, player).isUnlocked
    );
    if (lockedCrimes.length > 0) {
      console.log(`\n🔒 LOCKED CRIMES (${lockedCrimes.length}):`);
      lockedCrimes.forEach((crime) => {
        const validation = LevelGateValidator.validateCrimeAccess(
          crime,
          player
        );
        const message = LevelGateValidator.getUnlockMessage(
          validation,
          player.level
        );
        console.log(`  ${message} ${crime.name}`);
      });
    }

    // Show available assets
    const availableAssets = LevelGateValidator.getAvailableAssets(
      assetTemplates,
      player
    );
    console.log(
      `\n🏢 AVAILABLE ASSETS (${availableAssets.length}/${assetTemplates.length}):`
    );
    availableAssets.forEach((asset) => {
      console.log(`  ✅ ${asset.name} (${asset.category})`);
    });

    // Show locked assets
    const lockedAssets = assetTemplates.filter(
      (asset) =>
        !LevelGateValidator.validateAssetAccess(asset, player).isUnlocked
    );
    if (lockedAssets.length > 0) {
      console.log(`\n🔒 LOCKED ASSETS (${lockedAssets.length}):`);
      lockedAssets.forEach((asset) => {
        const validation = LevelGateValidator.validateAssetAccess(
          asset,
          player
        );
        const message = LevelGateValidator.getUnlockMessage(
          validation,
          player.level
        );
        console.log(`  ${message} ${asset.name}`);
      });
    }

    // Show upcoming unlocks
    const upcomingUnlocks = LevelGateValidator.getUpcomingUnlocks(
      gameItems,
      crimeData,
      assetTemplates,
      player
    );

    if (Object.keys(upcomingUnlocks).length > 0) {
      console.log(`\n🎯 UPCOMING UNLOCKS:`);
      Object.entries(upcomingUnlocks).forEach(([level, content]) => {
        const xpNeeded = LevelGateValidator.getXPToUnlock(
          parseInt(level),
          player.level
        );
        console.log(`  📈 Level ${level} (${xpNeeded} XP needed):`);

        if (content.items.length > 0) {
          console.log(
            `    🛠️  Items: ${content.items.map((i) => i.name).join(", ")}`
          );
        }
        if (content.crimes.length > 0) {
          console.log(
            `    ⚡ Crimes: ${content.crimes.map((c) => c.name).join(", ")}`
          );
        }
        if (content.assets.length > 0) {
          console.log(
            `    🏢 Assets: ${content.assets.map((a) => a.name).join(", ")}`
          );
        }
      });
    }

    console.log("\n" + "=".repeat(50));
  });

  // Show progression overview
  console.log("\n📊 PROGRESSION OVERVIEW");
  console.log("-".repeat(40));

  const milestones = [1, 3, 5, 8, 12, 15, 20, 25, 30];
  milestones.forEach((level) => {
    const milestone = LevelCalculator.getLevelMilestone(level);
    const totalXP = LevelCalculator.getTotalXPForLevel(level);

    console.log(
      `\nLevel ${level}: ${
        milestone?.title || "No milestone"
      } (${totalXP} XP total)`
    );

    // Show what unlocks at this level
    const itemsAtLevel = gameItems.filter(
      (item) => item.metadata?.levelRequirement === level
    );
    const crimesAtLevel = crimeData.filter(
      (crime) => crime.requirements?.level === level
    );
    const assetsAtLevel = assetTemplates.filter(
      (asset) => asset.requirements?.level === level
    );

    if (itemsAtLevel.length > 0) {
      console.log(`  🛠️  Items: ${itemsAtLevel.map((i) => i.name).join(", ")}`);
    }
    if (crimesAtLevel.length > 0) {
      console.log(
        `  ⚡ Crimes: ${crimesAtLevel.map((c) => c.name).join(", ")}`
      );
    }
    if (assetsAtLevel.length > 0) {
      console.log(
        `  🏢 Assets: ${assetsAtLevel.map((a) => a.name).join(", ")}`
      );
    }
  });
}

// Run the demonstration
demonstrateLevelGating();
