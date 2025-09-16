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

import { BotBranding } from "../config/bot";
import { LevelCalculator } from "../config/economy";
import { crimeData, CrimeData } from "../data/crimes";
import { getCryptoCoin } from "../data/money";
import DatabaseManager from "../utils/DatabaseManager";
import { PlayerProgress } from "../utils/LevelGateValidator";
import { logger } from "../utils/ResponseUtil";
import JailService from "./JailService";
import MoneyService from "./MoneyService";

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
  // NEW: Strategic payout information
  paymentDetails?: {
    type: "cash" | "bank" | "crypto" | "mixed";
    reason?: string;
    breakdown?: {
      cash?: number;
      bank?: number;
      crypto?: { coin: string; amount: number };
    };
  };
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
    return crimeData.filter((crime) => {
      const levelReq = crime.requirements?.level || 1;
      return playerLevel >= levelReq;
    });
  }

  /**
   * Get crime data by ID
   */
  static getCrimeById(crimeId: string): CrimeData | null {
    return crimeData.find((crime) => crime.id === crimeId) || null;
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
        reason: `🔒 **${crime.name}** requires Level ${crime.requirements.level}\n⏫ Your current level: ${player.level}\n💡 Keep committing crimes to gain experience!`,
        requirements: [`Level ${crime.requirements.level}`],
      };
    }

    // Check reputation requirement
    if (
      crime.requirements?.reputation &&
      (player.reputation || 0) < crime.requirements.reputation
    ) {
      return {
        canCommit: false,
        reason: `🔒 **${crime.name}** requires ${
          crime.requirements.reputation
        } reputation\n⏫ Your current reputation: ${
          player.reputation || 0
        }\n💡 Complete successful crimes to build reputation!`,
        requirements: [`${crime.requirements.reputation} reputation`],
      };
    }



    // Check required items
    if (crime.requirements?.items && crime.requirements.items.length > 0) {
      // TODO: Check player inventory when inventory system is implemented
      requirements.push(`Items: ${crime.requirements.items.join(", ")}`);
    }

    if (requirements.length > 0) {
      return {
        canCommit: false,
        reason: `🔒 **${crime.name}** requires:\n${requirements
          .map((req) => `• ${req}`)
          .join(
            "\n"
          )}\n\n💡 Train your stats or level up to unlock this crime!`,
        requirements,
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
    // Input validation
    if (!crimeId || typeof crimeId !== "string") {
      throw new Error("Invalid crime ID provided");
    }

    if (!userId || typeof userId !== "string") {
      throw new Error("Invalid user ID provided");
    }

    const crime = this.getCrimeById(crimeId);
    if (!crime) {
      throw new Error(`Crime with ID ${crimeId} not found`);
    }

    // Get player data from database - use faster query
    const db = DatabaseManager.getClient();
    let user;

    try {
      user = await db.user.findUnique({
        where: { discordId: userId },
        include: {
          character: {
            select: {
              id: true,
              userId: true,
              experience: true,
              reputation: true,
              cashOnHand: true,
              stats: true,
            },
          },
        },
      });
    } catch (dbError) {
      logger.error(`Database error when fetching user ${userId}:`, dbError);
      throw new Error("Database connection failed. Please try again.");
    }

    if (!user?.character) {
      throw new Error(
        "You need to create a character first. Use `/user-create` to get started."
      );
    }

    const character = user.character;
    const currentLevel = LevelCalculator.getLevelFromXP(character.experience);

    // Parse stats from JSON with safety checks
    const stats = character.stats as any;
    const playerStats = {
      strength: Number(stats?.strength) || 10,
      stealth: Number(stats?.stealth) || 10,
      intelligence: Number(stats?.intelligence) || 10,
    };

    const player = {
      level: currentLevel,
      experience: character.experience || 0,
      reputation: character.reputation || 0,
      money: character.cashOnHand || 0,
      stats: playerStats,
    };

    // Validate access
    const validation = this.validateCrimeAccess(crime, player);
    if (!validation.canCommit) {
      throw new Error(validation.reason || "Cannot commit this crime");
    }

    // Calculate success rate
    const successRate = this.calculateSuccessRate(
      crime,
      player.stats,
      player.level
    );
    const isSuccess = Math.random() < successRate;

    let result: CrimeResult;

    try {
      if (isSuccess) {
        result = await this.handleSuccessfulCrime(
          crime,
          character,
          player.stats,
          currentLevel
        );
      } else {
        result = await this.handleFailedCrime(crime, character);
      }

      // Update database immediately with optimized single query
      await this.updatePlayerAfterCrime(user, result, crime);

      return result;
    } catch (executionError) {
      logger.error(
        `Crime execution error for user ${userId}, crime ${crimeId}:`,
        executionError
      );
      throw new Error("Crime execution failed. Please try again.");
    }
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

    // Generate success message with payout details
    let message = `✅ **${crime.name} Successful!**\n`;
    message += `💰 Earned: **${BotBranding.formatCurrency(moneyEarned)}**`;

    // Add payout method information
    if (crime.paymentType && crime.paymentType !== "cash") {
      message += `\n💳 **${this.getPaymentDescription(crime.paymentType)}**`;
      if (crime.paymentReason) {
        message += `\n💡 ${crime.paymentReason}`;
      }
    }

    message += `\n⭐ XP Gained: **${xpGained}**`;

    if (criticalSuccess) {
      message += `\n🎯 **CRITICAL SUCCESS!** Double XP earned!`;
    }

    if (leveledUp) {
      message += `\n🎉 **LEVEL UP!** You are now Level ${newLevel}!`;
    }

    // Prepare payment details for strategic processing
    const paymentDetails = {
      type: crime.paymentType || "cash",
      reason: crime.paymentReason,
      breakdown: this.calculatePaymentBreakdown(
        moneyEarned,
        crime.paymentType || "cash"
      ),
    } as any;

    return {
      success: true,
      moneyEarned,
      experienceGained: xpGained,
      message,
      leveledUp,
      newLevel: leveledUp ? newLevel : undefined,
      criticalSuccess,
      paymentDetails,
    };
  }

  /**
   * Get human-readable payment method description
   */
  private static getPaymentDescription(paymentType: string): string {
    switch (paymentType) {
      case "bank":
        return "Funds transferred to bank account";
      case "crypto":
        return "Payment received in cryptocurrency";
      case "mixed":
        return "Mixed payout: cash + bank transfer";
      default:
        return "Cash payment received";
    }
  }

  /**
   * Calculate how money should be distributed across payment types
   */
  private static calculatePaymentBreakdown(
    amount: number,
    paymentType: string
  ) {
    switch (paymentType) {
      case "bank":
        return { bank: amount };
      case "crypto":
        // For crypto payments, use the single configured cryptocurrency
        const coin = getCryptoCoin();
        return { crypto: { coin: coin.id, amount: amount } };
      case "mixed":
        // 60% cash, 40% bank for mixed payments
        const cashAmount = Math.floor(amount * 0.6);
        const bankAmount = amount - cashAmount;
        return { cash: cashAmount, bank: bankAmount };
      default:
        return { cash: amount };
    }
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
      crime.jailTimeMin +
        Math.random() * (crime.jailTimeMax - crime.jailTimeMin)
    );

    // Calculate injury damage (if any)
    let injuryDamage = 0;
    if (
      crime.riskFactors?.injury_chance &&
      Math.random() < crime.riskFactors.injury_chance
    ) {
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
      injuryDamage,
    };
  }

  /**
   * Update player data after crime execution
   */
  private static async updatePlayerAfterCrime(
    user: any,
    result: CrimeResult,
    crime: CrimeData
  ): Promise<void> {
    try {
      if (result.success && user.character) {
        const db = DatabaseManager.getClient();
        const updateData: any = {};

        // Handle experience and reputation updates
        updateData.experience = { increment: result.experienceGained };
        const reputationGain = Math.floor(crime.difficulty * 2);
        updateData.reputation = { increment: reputationGain };

        // Update level if player leveled up
        if (result.leveledUp && result.newLevel) {
          updateData.level = result.newLevel;
        }

        // Handle strategic payout in the same transaction
        if (result.paymentDetails?.breakdown) {
          const breakdown = result.paymentDetails.breakdown;

          if (breakdown.cash) {
            updateData.cashOnHand = { increment: breakdown.cash };
          }

          if (breakdown.bank) {
            updateData.bankBalance = { increment: breakdown.bank };
          }

          if (breakdown.crypto) {
            // For crypto, add as cash first (conversion happens async)
            updateData.cashOnHand = {
              increment:
                (updateData.cashOnHand?.increment || 0) +
                breakdown.crypto.amount,
            };
          }
        }

        // Single database transaction for all updates
        await db.character.update({
          where: { id: user.character.id },
          data: updateData,
        });

        // Handle crypto conversion asynchronously (don't block the response)
        if (result.paymentDetails?.breakdown?.crypto) {
          const cryptoInfo = result.paymentDetails.breakdown.crypto;
          setImmediate(async () => {
            try {
              const moneyService = MoneyService.getInstance();
              await moneyService.buyCrypto(
                user.discordId,
                cryptoInfo.coin,
                cryptoInfo.amount
              );
            } catch (error) {
              logger.error(
                `Async crypto conversion failed for ${user.discordId}:`,
                error
              );
            }
          });
        }
      } else if (!result.success && result.jailTime && result.jailTime > 0) {
        // Handle failed crime - send to jail
        try {
          await JailService.sendToJail(
            user.discordId,
            result.jailTime,
            crime.name,
            crime.difficulty
          );
          logger.info(
            `Player ${user.discordId} sent to jail for ${result.jailTime} minutes (crime: ${crime.name})`
          );
        } catch (jailError) {
          logger.error(
            `Failed to send player ${user.discordId} to jail:`,
            jailError
          );
          // Don't throw here - crime already failed, we just couldn't jail them
          // But we should notify the user somehow
          logger.warn(
            `Player ${user.discordId} escaped jail due to system error after failed ${crime.name}`
          );
        }
      }

      logger.info(
        `Crime ${crime.id} executed by ${user.discordId}: Success=${
          result.success
        }, Money=${result.moneyEarned}, XP=${
          result.experienceGained
        }, PaymentType=${result.paymentDetails?.type || "cash"}${
          result.jailTime ? `, JailTime=${result.jailTime}min` : ""
        }`
      );
    } catch (error) {
      logger.error(`Failed to update player after crime ${crime.id}:`, error);
      throw error;
    }
  }

  /**
   * Get crime cooldown for a player
   */
  static async getCrimeCooldown(
    userId: string,
    crimeId: string
  ): Promise<number> {
    // TODO: Implement cooldown tracking in database
    // For now, return 0 (no cooldown)
    return 0;
  }

  /**
   * Check if player is in jail
   */
  static async isPlayerInJail(
    userId: string
  ): Promise<{ inJail: boolean; timeLeft?: number }> {
    try {
      const jailStatus = await JailService.isPlayerInJail(userId);
      return {
        inJail: jailStatus.inJail,
        timeLeft: jailStatus.timeLeft,
      };
    } catch (error) {
      logger.error(`Failed to check jail status for ${userId}:`, error);
      return { inJail: false };
    }
  }
}
