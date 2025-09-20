/**
 * LEVEL GATE VALIDATION SYSTEM
 * 
 * Validates that players can only access items, crimes, and assets
 * that match their current level and progression.
 */

import { BotBranding } from "../config/bot";
import { LevelCalculator } from "../config/economy";
import type { GameItem } from "../data/items";
import type { CrimeData } from "../data/crimes";
import type { AssetTemplate } from "../data/assets";

export interface PlayerProgress {
  level: number;
  experience: number;
  reputation?: number;
  money?: number;
  stats?: {
    strength?: number;
    stealth?: number;
    intelligence?: number;
  };
}

export interface ValidationResult {
  isUnlocked: boolean;
  requirements: string[];
  missingRequirements: string[];
  unlockLevel?: number;
}

export class LevelGateValidator {
  /**
   * Validate if a player can access a specific item
   */
  static validateItemAccess(
    item: GameItem, 
    player: PlayerProgress
  ): ValidationResult {
    const requirements: string[] = [];
    const missingRequirements: string[] = [];
    let isUnlocked = true;

    // Check level requirement
    const levelReq = item.metadata?.levelRequirement;
    if (levelReq) {
      requirements.push(`Level ${levelReq}`);
      if (player.level < levelReq) {
        missingRequirements.push(`Level ${levelReq} (current: ${player.level})`);
        isUnlocked = false;
      }
    }

    // Check stat requirements (for tools like hacking laptop)
    const statReqs = item.metadata?.requirements;
    if (statReqs && player.stats) {
      Object.entries(statReqs).forEach(([stat, value]) => {
        if (stat !== 'level' && typeof value === 'number') {
          requirements.push(`${stat.charAt(0).toUpperCase() + stat.slice(1)}: ${value}`);
          const playerStat = player.stats?.[stat as keyof typeof player.stats] || 0;
          if (playerStat < value) {
            missingRequirements.push(`${stat}: ${value} (current: ${playerStat})`);
            isUnlocked = false;
          }
        }
      });
    }

    return {
      isUnlocked,
      requirements,
      missingRequirements,
      unlockLevel: levelReq,
    };
  }

  /**
   * Validate if a player can perform a specific crime
   */
  static validateCrimeAccess(
    crime: CrimeData, 
    player: PlayerProgress
  ): ValidationResult {
    const requirements: string[] = [];
    const missingRequirements: string[] = [];
    let isUnlocked = true;

    // Check level requirement
    const levelReq = crime.requirements?.level;
    if (levelReq) {
      requirements.push(`Level ${levelReq}`);
      if (player.level < levelReq) {
        missingRequirements.push(`Level ${levelReq} (current: ${player.level})`);
        isUnlocked = false;
      }
    }

    // Check stat requirements
    const statReqs = crime.requirements;
    if (statReqs && player.stats) {
      Object.entries(statReqs).forEach(([stat, value]) => {
        if (stat !== 'level' && typeof value === 'number') {
          requirements.push(`${stat.charAt(0).toUpperCase() + stat.slice(1)}: ${value}`);
          const playerStat = player.stats?.[stat as keyof typeof player.stats] || 0;
          if (playerStat < value) {
            missingRequirements.push(`${stat}: ${value} (current: ${playerStat})`);
            isUnlocked = false;
          }
        }
      });
    }

    return {
      isUnlocked,
      requirements,
      missingRequirements,
      unlockLevel: levelReq,
    };
  }

  /**
   * Validate if a player can purchase/operate a specific asset
   */
  static validateAssetAccess(
    asset: AssetTemplate, 
    player: PlayerProgress
  ): ValidationResult {
    const requirements: string[] = [];
    const missingRequirements: string[] = [];
    let isUnlocked = true;

    // Check level requirement
    const levelReq = asset.requirements?.level;
    if (levelReq) {
      requirements.push(`Level ${levelReq}`);
      if (player.level < levelReq) {
        missingRequirements.push(`Level ${levelReq} (current: ${player.level})`);
        isUnlocked = false;
      }
    }

    // Check reputation requirement
    const repReq = asset.requirements?.reputation;
    if (repReq) {
      requirements.push(`Reputation: ${repReq}`);
      const playerRep = player.reputation || 0;
      if (playerRep < repReq) {
        missingRequirements.push(`Reputation: ${repReq} (current: ${playerRep})`);
        isUnlocked = false;
      }
    }

    // Check money requirement
    const moneyReq = asset.requirements?.money;
    if (moneyReq) {
      requirements.push(`Money: ${BotBranding.formatCurrency(moneyReq)}`);
      const playerMoney = player.money || 0;
      if (playerMoney < moneyReq) {
        missingRequirements.push(`Money: ${BotBranding.formatCurrency(moneyReq)} (current: ${BotBranding.formatCurrency(playerMoney)})`);
        isUnlocked = false;
      }
    }

    return {
      isUnlocked,
      requirements,
      missingRequirements,
      unlockLevel: levelReq,
    };
  }

  /**
   * Get all items available to a player at their current level
   */
  static getAvailableItems(
    items: GameItem[], 
    player: PlayerProgress
  ): GameItem[] {
    return items.filter(item => 
      this.validateItemAccess(item, player).isUnlocked
    );
  }

  /**
   * Get all crimes available to a player at their current level
   */
  static getAvailableCrimes(
    crimes: CrimeData[], 
    player: PlayerProgress
  ): CrimeData[] {
    return crimes.filter(crime => 
      this.validateCrimeAccess(crime, player).isUnlocked
    );
  }

  /**
   * Get all assets available to a player at their current level
   */
  static getAvailableAssets(
    assets: AssetTemplate[], 
    player: PlayerProgress
  ): AssetTemplate[] {
    return assets.filter(asset => 
      this.validateAssetAccess(asset, player).isUnlocked
    );
  }

  /**
   * Get upcoming unlocks for a player (next 3 levels)
   */
  static getUpcomingUnlocks(
    items: GameItem[],
    crimes: CrimeData[],
    assets: AssetTemplate[],
    player: PlayerProgress
  ) {
    const unlocks: { [level: number]: { items: GameItem[], crimes: CrimeData[], assets: AssetTemplate[] } } = {};
    
    // Check next 5 levels
    for (let level = player.level + 1; level <= player.level + 5; level++) {
      unlocks[level] = { items: [], crimes: [], assets: [] };
      
      // Check items
      items.forEach(item => {
        if (item.metadata?.levelRequirement === level) {
          unlocks[level].items.push(item);
        }
      });
      
      // Check crimes
      crimes.forEach(crime => {
        if (crime.requirements?.level === level) {
          unlocks[level].crimes.push(crime);
        }
      });
      
      // Check assets
      assets.forEach(asset => {
        if (asset.requirements?.level === level) {
          unlocks[level].assets.push(asset);
        }
      });
    }
    
    // Remove empty levels
    Object.keys(unlocks).forEach(level => {
      const levelNum = parseInt(level);
      if (unlocks[levelNum].items.length === 0 && 
          unlocks[levelNum].crimes.length === 0 && 
          unlocks[levelNum].assets.length === 0) {
        delete unlocks[levelNum];
      }
    });
    
    return unlocks;
  }

  /**
   * Calculate how much XP a player needs to unlock something
   */
  static getXPToUnlock(targetLevel: number, currentLevel: number): number {
    if (currentLevel >= targetLevel) return 0;
    
    const currentTotalXP = LevelCalculator.getTotalXPForLevel(currentLevel);
    const targetTotalXP = LevelCalculator.getTotalXPForLevel(targetLevel);
    
    return targetTotalXP - currentTotalXP;
  }

  /**
   * Get a formatted message about what a player needs to unlock something
   */
  static getUnlockMessage(
    validation: ValidationResult,
    currentLevel: number
  ): string {
    if (validation.isUnlocked) {
      return "✅ Available";
    }

    const messages: string[] = [];
    
    if (validation.unlockLevel && validation.unlockLevel > currentLevel) {
      const xpNeeded = this.getXPToUnlock(validation.unlockLevel, currentLevel);
      messages.push(`🔒 Unlocks at Level ${validation.unlockLevel} (${xpNeeded} XP needed)`);
    }
    
    if (validation.missingRequirements.length > 0) {
      messages.push(`❌ Missing: ${validation.missingRequirements.join(', ')}`);
    }
    
    return messages.join(' ');
  }
}

// Quick utility functions for common use cases
export const canUseItem = (item: GameItem, player: PlayerProgress): boolean => 
  LevelGateValidator.validateItemAccess(item, player).isUnlocked;

export const canDoCrime = (crime: CrimeData, player: PlayerProgress): boolean => 
  LevelGateValidator.validateCrimeAccess(crime, player).isUnlocked;

export const canBuyAsset = (asset: AssetTemplate, player: PlayerProgress): boolean => 
  LevelGateValidator.validateAssetAccess(asset, player).isUnlocked;
