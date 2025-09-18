#!/usr/bin/env ts-node

/**
 * Static Data Validation Utility
 * 
 * Validates the integrity of static data files to ensure:
 * - No duplicate IDs across data sets
 * - Required fields are present
 * - Data relationships are valid
 * - Consistent naming and structure
 */

import { crimeData, CrimeData } from "../data/crimes";
import { assetTemplates, AssetTemplate } from "../data/assets";
import { gameItems, GameItem } from "../data/items";
import { getCryptoCoin } from "../data/money";
import { logger } from "../utils/ResponseUtil";

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    crimes: number;
    assets: number;
    items: number;
    totalStaticRecords: number;
  };
}

class StaticDataValidator {
  private errors: string[] = [];
  private warnings: string[] = [];

  /**
   * Validate all static data
   */
  validate(): ValidationResult {
    this.errors = [];
    this.warnings = [];

    logger.info("🔍 Validating static data integrity...");

    this.validateCrimes();
    this.validateAssets();
    this.validateItems();
    this.validateCrypto();
    this.validateCrossReferences();
    this.validateUniqueIds();

    const result: ValidationResult = {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      summary: {
        crimes: crimeData.length,
        assets: assetTemplates.length,
        items: gameItems.length,
        totalStaticRecords: crimeData.length + assetTemplates.length + gameItems.length
      }
    };

    this.printResults(result);
    return result;
  }

  /**
   * Validate crime data structure and business logic
   */
  private validateCrimes(): void {
    logger.info("🔫 Validating crimes...");

    crimeData.forEach((crime, index) => {
      // Required fields
      if (!crime.id) {
        this.errors.push(`Crime at index ${index}: Missing required field 'id'`);
      }
      if (!crime.name) {
        this.errors.push(`Crime ${crime.id}: Missing required field 'name'`);
      }
      if (!crime.description) {
        this.errors.push(`Crime ${crime.id}: Missing required field 'description'`);
      }

      // Business logic validation
      if (crime.difficulty < 1 || crime.difficulty > 10) {
        this.errors.push(`Crime ${crime.id}: Difficulty must be between 1-10, got ${crime.difficulty}`);
      }

      if (crime.rewardMin >= crime.rewardMax) {
        this.errors.push(`Crime ${crime.id}: rewardMin (${crime.rewardMin}) must be less than rewardMax (${crime.rewardMax})`);
      }

      if (crime.baseSuccessRate < 0 || crime.baseSuccessRate > 1) {
        this.errors.push(`Crime ${crime.id}: baseSuccessRate must be between 0-1, got ${crime.baseSuccessRate}`);
      }

      if (crime.jailTimeMin >= crime.jailTimeMax) {
        this.warnings.push(`Crime ${crime.id}: jailTimeMin should be less than jailTimeMax`);
      }

      // Category validation
      const validCategories = ["petty", "theft", "robbery", "violence", "white_collar", "organized"];
      if (!validCategories.includes(crime.category)) {
        this.errors.push(`Crime ${crime.id}: Invalid category '${crime.category}'. Must be one of: ${validCategories.join(", ")}`);
      }

      // Requirements validation
      if (crime.requirements?.level && crime.requirements.level < 1) {
        this.errors.push(`Crime ${crime.id}: Level requirement must be positive, got ${crime.requirements.level}`);
      }
    });
  }

  /**
   * Validate asset templates
   */
  private validateAssets(): void {
    logger.info("🏢 Validating assets...");

    assetTemplates.forEach((asset, index) => {
      // Required fields
      if (!asset.id) {
        this.errors.push(`Asset at index ${index}: Missing required field 'id'`);
      }
      if (!asset.name) {
        this.errors.push(`Asset ${asset.id}: Missing required field 'name'`);
      }
      if (!asset.type) {
        this.errors.push(`Asset ${asset.id}: Missing required field 'type'`);
      }

      // Price validation
      if (asset.basePrice <= 0) {
        this.errors.push(`Asset ${asset.id}: basePrice must be positive, got ${asset.basePrice}`);
      }

      if (asset.baseIncomeRate < 0) {
        this.errors.push(`Asset ${asset.id}: baseIncomeRate cannot be negative, got ${asset.baseIncomeRate}`);
      }

      // Level validation
      if (asset.maxLevel < 1) {
        this.errors.push(`Asset ${asset.id}: maxLevel must be at least 1, got ${asset.maxLevel}`);
      }

      // Income distribution validation
      if (asset.incomeDistribution) {
        const total = asset.incomeDistribution.cash + asset.incomeDistribution.bank + asset.incomeDistribution.crypto;
        if (Math.abs(total - 100) > 0.01) {
          this.errors.push(`Asset ${asset.id}: Income distribution must sum to 100%, got ${total}%`);
        }
      }

      // Upgrades validation
      if (asset.upgrades?.income) {
        asset.upgrades.income.forEach((upgrade, upgradeIndex) => {
          if (upgrade.cost <= 0) {
            this.errors.push(`Asset ${asset.id}: Income upgrade ${upgradeIndex} cost must be positive`);
          }
          if (upgrade.multiplier <= 1) {
            this.warnings.push(`Asset ${asset.id}: Income upgrade ${upgradeIndex} multiplier should be > 1 for meaningful upgrade`);
          }
        });
      }
    });
  }

  /**
   * Validate game items
   */
  private validateItems(): void {
    logger.info("🎒 Validating items...");

    gameItems.forEach((item, index) => {
      // Required fields
      if (!item.id) {
        this.errors.push(`Item at index ${index}: Missing required field 'id'`);
      }
      if (!item.name) {
        this.errors.push(`Item ${item.id}: Missing required field 'name'`);
      }

      // Type validation
      const validTypes = ["tool", "consumable", "trade_good", "collectible"];
      if (!validTypes.includes(item.type)) {
        this.errors.push(`Item ${item.id}: Invalid type '${item.type}'. Must be one of: ${validTypes.join(", ")}`);
      }

      // Rarity validation
      const validRarities = ["common", "uncommon", "rare", "epic", "legendary"];
      if (!validRarities.includes(item.rarity)) {
        this.errors.push(`Item ${item.id}: Invalid rarity '${item.rarity}'. Must be one of: ${validRarities.join(", ")}`);
      }

      // Value validation
      if (item.value <= 0) {
        this.errors.push(`Item ${item.id}: value must be positive, got ${item.value}`);
      }

      // Purchase method validation
      if (item.purchaseMethod) {
        const validMethods = ["cash", "bank", "crypto", "any"];
        if (!validMethods.includes(item.purchaseMethod)) {
          this.errors.push(`Item ${item.id}: Invalid purchaseMethod '${item.purchaseMethod}'. Must be one of: ${validMethods.join(", ")}`);
        }
      }
    });
  }

  /**
   * Validate cryptocurrency configuration
   */
  private validateCrypto(): void {
    logger.info("💰 Validating crypto configuration...");

    try {
      const crypto = getCryptoCoin();
      
      if (!crypto.id) {
        this.errors.push("Crypto: Missing required field 'id'");
      }
      if (!crypto.name) {
        this.errors.push("Crypto: Missing required field 'name'");
      }
      if (!crypto.symbol) {
        this.errors.push("Crypto: Missing required field 'symbol'");
      }
      if (crypto.basePrice <= 0) {
        this.errors.push(`Crypto: basePrice must be positive, got ${crypto.basePrice}`);
      }
      if (crypto.volatility < 0 || crypto.volatility > 1) {
        this.errors.push(`Crypto: volatility must be between 0-1, got ${crypto.volatility}`);
      }
    } catch (error) {
      this.errors.push(`Crypto configuration error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate cross-references between data sets
   */
  private validateCrossReferences(): void {
    logger.info("🔗 Validating cross-references...");

    // Check for item references in crime requirements
    crimeData.forEach(crime => {
      if (crime.requirements?.items) {
        crime.requirements.items.forEach(itemId => {
          const itemExists = gameItems.some(item => item.id === itemId);
          if (!itemExists) {
            this.errors.push(`Crime ${crime.id}: References non-existent item '${itemId}'`);
          }
        });
      }
    });
  }

  /**
   * Validate that all IDs are unique across all data sets
   */
  private validateUniqueIds(): void {
    logger.info("🆔 Validating unique IDs...");

    const allIds: { id: string; source: string }[] = [];

    // Collect all IDs
    crimeData.forEach(crime => allIds.push({ id: crime.id, source: 'crimes' }));
    assetTemplates.forEach(asset => allIds.push({ id: asset.id, source: 'assets' }));
    gameItems.forEach(item => allIds.push({ id: item.id, source: 'items' }));

    // Check for duplicates
    const idMap = new Map<string, string[]>();
    allIds.forEach(({ id, source }) => {
      if (!idMap.has(id)) {
        idMap.set(id, []);
      }
      idMap.get(id)!.push(source);
    });

    idMap.forEach((sources, id) => {
      if (sources.length > 1) {
        this.errors.push(`Duplicate ID '${id}' found in: ${sources.join(", ")}`);
      }
    });
  }

  /**
   * Print validation results
   */
  private printResults(result: ValidationResult): void {
    console.log("\n" + "=".repeat(50));
    console.log("📊 STATIC DATA VALIDATION RESULTS");
    console.log("=".repeat(50));

    console.log(`📈 Summary:`);
    console.log(`   Crimes: ${result.summary.crimes}`);
    console.log(`   Assets: ${result.summary.assets}`);
    console.log(`   Items: ${result.summary.items}`);
    console.log(`   Total Records: ${result.summary.totalStaticRecords}`);

    if (result.errors.length === 0) {
      console.log(`\n✅ Validation PASSED - No errors found!`);
    } else {
      console.log(`\n❌ Validation FAILED - ${result.errors.length} error(s) found:`);
      result.errors.forEach(error => console.log(`   🔴 ${error}`));
    }

    if (result.warnings.length > 0) {
      console.log(`\n⚠️  ${result.warnings.length} warning(s):`);
      result.warnings.forEach(warning => console.log(`   🟡 ${warning}`));
    }

    console.log("\n" + "=".repeat(50));
  }
}

// Execute validation if run directly
if (require.main === module) {
  const validator = new StaticDataValidator();
  const result = validator.validate();
  
  process.exit(result.isValid ? 0 : 1);
}

export { StaticDataValidator, ValidationResult };