/**
 * JAIL SERVICE
 * 
 * Handles all jail-related functionality including:
 * - Jail status checking and time calculations
 * - Dynamic bribe calculation based on player wealth and crime severity
 * - Jailing players and managing jail time
 * - Bribe payments and jail release
 * - Jail system utilities
 */

import { BotBranding } from "../config/bot";
import DatabaseManager from "../utils/DatabaseManager";
import { logger } from "../utils/ResponseUtil";
import MoneyService from "./MoneyService";

export interface JailStatus {
  inJail: boolean;
  timeLeft?: number; // minutes remaining
  timeLeftFormatted?: string; // human readable
  crime?: string; // what crime landed them in jail
  severity?: number; // crime severity (1-10)
  canBribe?: boolean; // whether bribing is allowed
  bribeAmount?: number; // cost to bribe out
}

export interface BribeResult {
  success: boolean;
  message: string;
  amountPaid?: number;
  timeReduced?: number; // minutes reduced from sentence
}

export class JailService {
  /**
   * Check if a player is currently in jail and return comprehensive status
   */
  static async isPlayerInJail(userId: string): Promise<JailStatus> {
    try {
      const user = await DatabaseManager.getUserForAuth(userId);
      if (!user?.character) {
        return {
          inJail: false,
          timeLeft: 0,
          timeLeftFormatted: "0m"
        };
      }

      const character = user.character;
      const now = new Date();

      // Check if player is in jail
      if (!character.jailUntil || character.jailUntil <= now) {
        return {
          inJail: false,
          timeLeft: 0,
          timeLeftFormatted: "0m"
        };
      }

      // Player is in jail - calculate remaining time
      const timeLeftMs = character.jailUntil.getTime() - now.getTime();
      const timeLeftMinutes = Math.max(0, Math.ceil(timeLeftMs / (1000 * 60)));

      // Use stored bribe amount, or calculate if not set (legacy support)
      let bribeAmount = character.jailBribeAmount;
      if (!bribeAmount) {
        // Fallback for existing jail sentences without stored bribe amount
        const playerWealth = character.cashOnHand + character.bankBalance;
        bribeAmount = this.calculateBribeAmount(character.jailSeverity, playerWealth, timeLeftMinutes);
      }

      const canAffordBribe = (character.cashOnHand + character.bankBalance) >= bribeAmount;

      return {
        inJail: true,
        timeLeft: timeLeftMinutes,
        timeLeftFormatted: this.formatJailTime(timeLeftMinutes),
        crime: character.jailCrime || "Unknown",
        severity: character.jailSeverity,
        bribeAmount,
        canBribe: canAffordBribe
      };

    } catch (error) {
      logger.error(`Failed to check jail status for ${userId}:`, error);
      return {
        inJail: false,
        timeLeft: 0,
        timeLeftFormatted: "0m"
      };
    }
  }

  /**
   * Send a player to jail
   */
  static async sendToJail(
    userId: string, 
    jailTimeMinutes: number, 
    crime: string, 
    severity: number = 5
  ): Promise<void> {
    try {
      const user = await DatabaseManager.getUserForAuth(userId);
      if (!user?.character) {
        throw new Error("Character not found");
      }

      const character = user.character;
      const jailUntil = new Date(Date.now() + (jailTimeMinutes * 60 * 1000));
      
      // Calculate bribe amount once when jailing (includes randomness)
      const playerWealth = character.cashOnHand + character.bankBalance;
      const clampedSeverity = Math.max(1, Math.min(10, severity)); // Clamp between 1-10
      const bribeAmount = this.calculateBribeAmount(clampedSeverity, playerWealth, jailTimeMinutes);
      
      const db = DatabaseManager.getClient();

      // Update character directly using character ID
      await db.character.update({
        where: { id: character.id },
        data: {
          jailUntil,
          jailCrime: crime,
          jailSeverity: clampedSeverity,
          jailBribeAmount: bribeAmount, // Store the calculated bribe amount
          totalJailTime: { increment: jailTimeMinutes }
        }
      });

      logger.info(`Player ${userId} sent to jail for ${jailTimeMinutes} minutes (crime: ${crime}, severity: ${severity})`);
    } catch (error) {
      logger.error(`Failed to send player ${userId} to jail:`, error);
      throw error;
    }
  }

  /**
   * Release a player from jail (either time served or bribed out)
   */
  static async releaseFromJail(userId: string, reason: string = "time served"): Promise<void> {
    try {
      const user = await DatabaseManager.getUserForAuth(userId);
      if (!user?.character) {
        throw new Error("Character not found");
      }

      const db = DatabaseManager.getClient();
      
      await db.character.update({
        where: { id: user.character.id },
        data: {
          jailUntil: null,
          jailCrime: null,
          jailSeverity: 0,
          jailBribeAmount: null // Clear the stored bribe amount
        }
      });

      logger.info(`Player ${userId} released from jail (${reason})`);
    } catch (error) {
      logger.error(`Failed to release player ${userId} from jail:`, error);
      throw error;
    }
  }

  /**
   * Process a bribe payment to get out of jail
   */
  static async processBribe(userId: string): Promise<BribeResult> {
    try {
      const jailStatus = await this.isPlayerInJail(userId);
      
      if (!jailStatus.inJail) {
        return {
          success: false,
          message: "You're not in jail, so no bribe is needed!"
        };
      }

      if (!jailStatus.canBribe) {
        return {
          success: false,
          message: `You don't have enough money to bribe your way out! Need ${BotBranding.formatCurrency(jailStatus.bribeAmount || 0)}.`
        };
      }

      const bribeAmount = jailStatus.bribeAmount!;
      
      // Try to pay the bribe (prefer cash first, then bank) - crypto is invisible to police
      const paymentResult = await this.deductMoneyForBribe(userId, bribeAmount);

      if (!paymentResult.success) {
        return {
          success: false,
          message: paymentResult.message || "Failed to process bribe payment. Please try again."
        };
      }

      // Release from jail
      await this.releaseFromJail(userId, "bribed out");

      const timeReduced = jailStatus.timeLeft || 0;

      return {
        success: true,
        message: `🤝 **Bribe successful!** You've paid ${BotBranding.formatCurrency(bribeAmount)} to get out of jail.\n` +
                `💳 **Payment:** ${paymentResult.source}\n` +
                `⏰ You saved **${jailStatus.timeLeftFormatted}** of jail time.\n` +
                `💡 *Remember: Crypto is invisible to police, so keep some hidden!*`,
        amountPaid: bribeAmount,
        timeReduced
      };

    } catch (error) {
      logger.error(`Failed to process bribe for ${userId}:`, error);
      return {
        success: false,
        message: "An error occurred while processing your bribe. Please try again."
      };
    }
  }

  /**
   * Deduct money for bribe payment (cash first, then bank)
   */
  private static async deductMoneyForBribe(userId: string, amount: number): Promise<{
    success: boolean;
    message?: string;
    amountDeducted?: number;
    source?: string;
  }> {
    try {
      const user = await DatabaseManager.getUserForAuth(userId);
      if (!user?.character) {
        return {
          success: false,
          message: "Character not found"
        };
      }

      const character = user.character;
      const totalAvailable = character.cashOnHand + character.bankBalance;
      
      // Check if player has enough total money (cash + bank only, no crypto)
      if (totalAvailable < amount) {
        return {
          success: false,
          message: `Insufficient funds. You have ${BotBranding.formatCurrency(totalAvailable)} available (cash + bank), need ${BotBranding.formatCurrency(amount)}.\n💡 *Crypto is hidden from police and cannot be used for bribes!*`
        };
      }

      let amountFromCash = 0;
      let amountFromBank = 0;

      // Use cash first, then bank to cover the remaining amount
      if (character.cashOnHand >= amount) {
        // Can pay entirely with cash
        amountFromCash = amount;
      } else {
        // Use all available cash, then bank for the rest
        amountFromCash = character.cashOnHand;
        amountFromBank = amount - amountFromCash;
      }

      // Deduct the money in a transaction
      const db = DatabaseManager.getClient();
      await db.character.update({
        where: { id: character.id },
        data: {
          cashOnHand: { decrement: amountFromCash },
          bankBalance: { decrement: amountFromBank }
        }
      });

      // Log the bribe transaction using the User's UUID (not Discord ID)
      await db.bankTransaction.create({
        data: {
          userId: user.id, // Use User's UUID, not Discord ID
          transactionType: "fee",
          amount: -amount,
          fee: 0,
          balanceBefore: character.cashOnHand + character.bankBalance,
          balanceAfter: (character.cashOnHand + character.bankBalance) - amount,
          description: `Jail bribe payment - ${BotBranding.formatCurrency(amountFromCash)} cash + ${BotBranding.formatCurrency(amountFromBank)} bank`
        }
      });

      return {
        success: true,
        amountDeducted: amount,
        source: amountFromBank > 0 ? `${BotBranding.formatCurrency(amountFromCash)} cash + ${BotBranding.formatCurrency(amountFromBank)} bank` : "cash only"
      };

    } catch (error) {
      logger.error(`Failed to deduct money for bribe (user: ${userId}, amount: ${amount}):`, error);
      return {
        success: false,
        message: "Payment processing failed - please try again"
      };
    }
  }

  /**
   * Calculate dynamic bribe amount based on multiple factors
   */
  static calculateBribeAmount(
    crimeSeverity: number, 
    playerWealth: number, 
    timeLeftMinutes: number
  ): number {
    // Base bribe starts at $1000 per severity point
    let baseBribe = crimeSeverity * 1000;

    // Wealth factor: Police know about visible money (cash + bank)
    // Higher wealth = higher bribes (corrupt police want more)
    const wealthMultiplier = Math.min(3, 1 + (playerWealth / 100000)); // Max 3x multiplier at $100k+
    baseBribe = Math.floor(baseBribe * wealthMultiplier);

    // Time factor: Longer sentences are more expensive to escape
    const timeMultiplier = Math.min(2, 1 + (timeLeftMinutes / 1440)); // Max 2x at 24+ hours
    baseBribe = Math.floor(baseBribe * timeMultiplier);

    // Add some randomness (±20%) to prevent predictability
    const randomFactor = 0.8 + (Math.random() * 0.4);
    baseBribe = Math.floor(baseBribe * randomFactor);

    // Minimum bribe amount
    return Math.max(500, baseBribe);
  }

  /**
   * Format jail time into human-readable format
   */
  static formatJailTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    } else {
      const days = Math.floor(minutes / 1440);
      const remainingHours = Math.floor((minutes % 1440) / 60);
      const remainingMinutes = minutes % 60;
      
      let formatted = `${days}d`;
      if (remainingHours > 0) formatted += ` ${remainingHours}h`;
      if (remainingMinutes > 0) formatted += ` ${remainingMinutes}m`;
      
      return formatted;
    }
  }

  /**
   * Get jail statistics for a player
   */
  static async getJailStats(userId: string): Promise<{
    totalJailTime: number;
    currentlyInJail: boolean;
    timeLeft?: number;
    escapesUsed: number; // Future: track bribe usage
  }> {
    try {
      const user = await DatabaseManager.getUserForAuth(userId);
      
      if (!user?.character) {
        return {
          totalJailTime: 0,
          currentlyInJail: false,
          escapesUsed: 0
        };
      }

      const jailStatus = await this.isPlayerInJail(userId);

      return {
        totalJailTime: user.character.totalJailTime,
        currentlyInJail: jailStatus.inJail,
        timeLeft: jailStatus.timeLeft,
        escapesUsed: 0 // TODO: Track bribe usage in future
      };
    } catch (error) {
      logger.error(`Failed to get jail stats for ${userId}:`, error);
      return {
        totalJailTime: 0,
        currentlyInJail: false,
        escapesUsed: 0
      };
    }
  }

  /**
   * Check if an action should be blocked due to jail status
   */
  static async checkJailBlocking(userId: string, actionType: string): Promise<{
    blocked: boolean;
    reason?: string;
    jailStatus?: JailStatus;
  }> {
    const jailStatus = await this.isPlayerInJail(userId);
    
    if (!jailStatus.inJail) {
      return { blocked: false };
    }

    // Actions that are blocked while in jail
    const blockedActions = [
      'crime', 'robbery', 'heist', 'business', 'trading', 
      'missions', 'gang_activities', 'asset_management', 'banking'
    ];

    if (blockedActions.includes(actionType)) {
      return {
        blocked: true,
        reason: `🚔 You're in jail and cannot perform this action!\n` +
               `⏰ Time remaining: **${jailStatus.timeLeftFormatted}**\n` +
               `💰 Bribe cost: **${BotBranding.formatCurrency(jailStatus.bribeAmount || 0)}**\n` +
               `💡 Use \`/jail bribe\` to pay your way out!`,
        jailStatus
      };
    }

    return { blocked: false };
  }
}

export default JailService;