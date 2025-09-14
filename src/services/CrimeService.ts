/**
 * CRIME SERVICE
 * 
 * Handles all crime execution logic including:
 * - Crime validation and requirements checking
 * - Success/failure calculations based on player stats
 * - Reward distribution and XP calculations
 * - Jail time and consequences
 * - Database updates for crime results
 */

import { LevelGateValidator, PlayerProgress } from "../utils/LevelGateValidator";
import { LevelCalculator } from "../config/economy";
import { crimeData, CrimeData } from "../data/crimes";
import { gameItems } from "../data/items";
import DatabaseManager from "../utils/DatabaseManager";
import { logger } from "../utils/ResponseUtil";

export interface CrimeResult {
  success: boolean;
  moneyEarned: number;
  experienceGained: number;
  message: string;
  jailTime?: number;
  injuryDamage?: number;
  heatGenerated?: number;
  leveledUp?: boolean;
  newLevel?: number;
  criticalSuccess?: boolean;
}

export interface PlayerStats {
  strength: number;
  stealth: number;
  intelligence: number;
}

export class CrimeService {
  /**
   * Get all available crimes for a player based on their level
   */
  static getAvailableCrimes(playerLevel: number): CrimeData[] {
    return crimeData.filter(crime => {
      const levelReq = crime.requirements?.level || 1;
      return playerLevel >= levelReq;
    });
  }

  /**
   * Get crime data by ID
   */
  static getCrimeById(crimeId: string): CrimeData | null {
    return crimeData.find(crime => crime.id === crimeId) || null;
  }

  /**
   * Validate if player can commit a specific crime
   */
  static validateCrimeAccess(
    crime: CrimeData,
    player: PlayerProgress & { stats: PlayerStats; money: number }
  ): { canCommit: boolean; reason?: string; requirements: string[] } {
    const requirements: string[] = [];
    
    // Check level requirement
    if (crime.requirements?.level && player.level < crime.requirements.level) {
      return {
        canCommit: false,
        reason: `Requires Level ${crime.requirements.level} (current: ${player.level})`,
        requirements: [`Level ${crime.requirements.level}`]
      };
    }

    // Check reputation requirement
    if (crime.requirements?.reputation && (player.reputation || 0) < crime.requirements.reputation) {
      return {
        canCommit: false,
        reason: `Requires ${crime.requirements.reputation} reputation (current: ${player.reputation || 0})`,
        requirements: [`${crime.requirements.reputation} reputation`]
      };
    }

    // Check stat requirements
    if (crime.requirements?.strength && player.stats.strength < crime.requirements.strength) {
      requirements.push(`${crime.requirements.strength} Strength`);
    }
    if (crime.requirements?.stealth && player.stats.stealth < crime.requirements.stealth) {
      requirements.push(`${crime.requirements.stealth} Stealth`);
    }
    if (crime.requirements?.intelligence && player.stats.intelligence < crime.requirements.intelligence) {
      requirements.push(`${crime.requirements.intelligence} Intelligence`);
    }

    // Check required items
    if (crime.requirements?.items && crime.requirements.items.length > 0) {
      // TODO: Check player inventory when inventory system is implemented
      requirements.push(`Items: ${crime.requirements.items.join(", ")}`);
    }

    if (requirements.length > 0) {
      return {
        canCommit: false,
        reason: `Missing requirements: ${requirements.join(", ")}`,
        requirements
      };
    }

    return { canCommit: true, requirements: [] };
  }

  /**
   * Calculate success rate based on player stats and crime requirements
   */
  static calculateSuccessRate(
    crime: CrimeData,
    player: PlayerStats,
    playerLevel: number
  ): number {
    let successRate = crime.baseSuccessRate;

    // Level bonus (higher level = better success rate)
    const levelBonus = Math.min(0.2, playerLevel * 0.01); // Max 20% bonus at level 20+
    successRate += levelBonus;

    // Stat bonuses
    if (crime.statBonuses) {
      if (crime.statBonuses.strength) {
        const bonus = Math.min(0.15, player.strength * 0.005); // Max 15% at 30 strength
        successRate += bonus;
      }
      if (crime.statBonuses.stealth) {
        const bonus = Math.min(0.15, player.stealth * 0.005);
        successRate += bonus;
      }
      if (crime.statBonuses.intelligence) {
        const bonus = Math.min(0.15, player.intelligence * 0.005);
        successRate += bonus;
      }
    }

    // Cap success rate at 95% (always some risk)
    return Math.min(0.95, successRate);
  }

  /**
   * Execute a crime attempt
   */
  static async executeCrime(
    crimeId: string,
    userId: string
  ): Promise<CrimeResult> {
    const crime = this.getCrimeById(crimeId);
    if (!crime) {
      throw new Error(`Crime with ID ${crimeId} not found`);
    }

    // Get player data from database
    const user = await DatabaseManager.getOrCreateUser(userId, "Unknown");
    if (!user.character) {
      throw new Error("Player character not found");
    }

    const character = user.character;
    const currentLevel = LevelCalculator.getLevelFromXP(character.experience);
    
    // Parse stats from JSON
    const stats = character.stats as any;
    const playerStats = {
      strength: stats?.strength || 10,
      stealth: stats?.stealth || 10,
      intelligence: stats?.intelligence || 10
    };

    const player = {
      level: currentLevel,
      experience: character.experience,
      reputation: character.reputation,
      money: character.money,
      stats: playerStats
    };

    // Validate access
    const validation = this.validateCrimeAccess(crime, player);
    if (!validation.canCommit) {
      throw new Error(validation.reason || "Cannot commit this crime");
    }

    // Calculate success rate
    const successRate = this.calculateSuccessRate(crime, player.stats, player.level);
    const isSuccess = Math.random() < successRate;

    let result: CrimeResult;

    if (isSuccess) {
      result = await this.handleSuccessfulCrime(crime, character, player.stats, currentLevel);
    } else {
      result = await this.handleFailedCrime(crime, character);
    }

    // Update database
    await this.updatePlayerAfterCrime(userId, result, crime);

    return result;
  }

  /**
   * Handle successful crime execution
   */
  private static async handleSuccessfulCrime(
    crime: CrimeData,
    character: any,
    stats: PlayerStats,
    currentLevel: number
  ): Promise<CrimeResult> {
    // Calculate money reward
    const moneyEarned = Math.floor(
      crime.rewardMin + Math.random() * (crime.rewardMax - crime.rewardMin)
    );

    // Calculate XP reward with potential bonus
    let xpGained = crime.xpReward;
    
    // Stat-based XP bonus
    if (crime.statBonuses) {
      let statBonus = 0;
      if (crime.statBonuses.strength) statBonus += stats.strength * 0.1;
      if (crime.statBonuses.stealth) statBonus += stats.stealth * 0.1;
      if (crime.statBonuses.intelligence) statBonus += stats.intelligence * 0.1;
      
      xpGained += Math.floor(statBonus);
    }

    // Check for critical success (5% chance for double rewards)
    const criticalSuccess = Math.random() < 0.05;
    if (criticalSuccess) {
      xpGained *= 2;
    }

    // Check if player levels up
    const newExperience = character.experience + xpGained;
    const newLevel = LevelCalculator.getLevelFromXP(newExperience);
    const leveledUp = newLevel > currentLevel;

    // Generate success message
    let message = `✅ **${crime.name} Successful!**\n`;
    message += `💰 Earned: **$${moneyEarned.toLocaleString()}**\n`;
    message += `⭐ XP Gained: **${xpGained}**`;

    if (criticalSuccess) {
      message += `\n🎯 **CRITICAL SUCCESS!** Double XP earned!`;
    }

    if (leveledUp) {
      message += `\n🎉 **LEVEL UP!** You are now Level ${newLevel}!`;
    }

    return {
      success: true,
      moneyEarned,
      experienceGained: xpGained,
      message,
      leveledUp,
      newLevel: leveledUp ? newLevel : undefined,
      criticalSuccess
    };
  }

  /**
   * Handle failed crime execution
   */
  private static async handleFailedCrime(
    crime: CrimeData,
    character: any
  ): Promise<CrimeResult> {
    // Calculate jail time
    const jailTime = Math.floor(
      crime.jailTimeMin + Math.random() * (crime.jailTimeMax - crime.jailTimeMin)
    );

    // Calculate injury damage (if any)
    let injuryDamage = 0;
    if (crime.riskFactors?.injury_chance && Math.random() < crime.riskFactors.injury_chance) {
      injuryDamage = Math.floor(Math.random() * 10) + 5; // 5-15 HP damage
    }

    // Generate failure message
    let message = `❌ **${crime.name} Failed!**\n`;
    message += `🚔 You've been caught and sentenced to **${jailTime} minutes** in jail!\n`;
    
    if (injuryDamage > 0) {
      message += `🩸 You were injured in the process (${injuryDamage} damage)\n`;
    }

    message += `💡 *Tip: Higher stats increase your success rate!*`;

    return {
      success: false,
      moneyEarned: 0,
      experienceGained: 0,
      message,
      jailTime,
      injuryDamage
    };
  }

  /**
   * Update player data after crime execution
   */
  private static async updatePlayerAfterCrime(
    userId: string,
    result: CrimeResult,
    crime: CrimeData
  ): Promise<void> {
    try {
      const updateData: any = {};

      if (result.success) {
        // Update money and experience
        updateData.money = { increment: result.moneyEarned };
        updateData.experience = { increment: result.experienceGained };
        
        // Increase reputation for successful crimes
        const reputationGain = Math.floor(crime.difficulty * 2);
        updateData.reputation = { increment: reputationGain };
      }
      // Note: Jail time functionality will be added when jailUntil field is added to schema

      // Update character
      await DatabaseManager.getClient().character.updateMany({
        where: { user: { discordId: userId } },
        data: updateData
      });

      logger.info(`Crime ${crime.id} executed by ${userId}: Success=${result.success}, Money=${result.moneyEarned}, XP=${result.experienceGained}`);
    } catch (error) {
      logger.error(`Failed to update player after crime ${crime.id}:`, error);
      throw error;
    }
  }

  /**
   * Get crime cooldown for a player
   */
  static async getCrimeCooldown(userId: string, crimeId: string): Promise<number> {
    // TODO: Implement cooldown tracking in database
    // For now, return 0 (no cooldown)
    return 0;
  }

  /**
   * Check if player is in jail
   */
  static async isPlayerInJail(userId: string): Promise<{ inJail: boolean; timeLeft?: number }> {
    try {
      // TODO: Implement jail system when jailUntil field is added to Character schema
      // For now, no players are in jail
      return { inJail: false };
    } catch (error) {
      logger.error(`Failed to check jail status for ${userId}:`, error);
      return { inJail: false };
    }
  }
}
