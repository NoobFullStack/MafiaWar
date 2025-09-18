import { BotBranding } from "../config/bot";
import {
  bankTiers,
  getCryptoCoin,
  type BankTier,
  type CryptoCoin,
} from "../data/money";
import DatabaseManager from "../utils/DatabaseManager";
import { logger } from "../utils/ResponseUtil";

export interface MoneyBalance {
  cashOnHand: number;
  bankBalance: number;
  cryptoWallet: Record<string, number>; // coin type -> amount
  totalValue: number;
}

export interface CryptoPortfolio {
  [coinType: string]: {
    amount: number;
    currentValue: number;
    change24h: number;
  };
}

export interface MoneyTransferResult {
  success: boolean;
  message: string;
  newBalance?: MoneyBalance;
  fees?: number;
  error?: string;
  data?: {
    amountProcessed: number;
    fees: number;
    coinAmount?: number;
    fromBalance: number;
    toBalance: number;
    cryptoBalance?: Record<string, number>;
  };
}

/**
 * Enhanced MoneyService that supports both legacy Character columns and new CurrencyBalance tables
 * This enables gradual migration with fallback capabilities
 */
export class MoneyServiceV2 {
  private static instance: MoneyServiceV2;
  private cryptoPrices: Map<
    string,
    { price: number; change24h: number; lastUpdate: Date }
  > = new Map();

  public static getInstance(): MoneyServiceV2 {
    if (!MoneyServiceV2.instance) {
      MoneyServiceV2.instance = new MoneyServiceV2();
    }
    return MoneyServiceV2.instance;
  }

  // ===== BALANCE OPERATIONS =====

  /**
   * Get user's current balances with hybrid read capability
   * Reads from CurrencyBalance tables first, falls back to Character columns
   */
  async getUserBalance(
    userId: string,
    includePortfolioValue: boolean = false
  ): Promise<{
    cashOnHand: number;
    bankBalance: number;
    cryptoWallet: Record<string, number>;
    level: number;
    totalValue?: number;
  } | null> {
    try {
      const db = DatabaseManager.getClient();

      const user = await db.user.findUnique({
        where: { discordId: userId },
        include: {
          character: {
            select: {
              cashOnHand: true,
              bankBalance: true,
              cryptoWallet: true,
              level: true,
            },
          },
          currencyBalances: true,
          bankingProfile: true,
        },
      });

      if (!user?.character) {
        return null;
      }

      const character = user.character;
      
      // Determine data source - prefer new tables if they exist
      const useNewTables = user.currencyBalances.length > 0 || user.bankingProfile;

      let cashOnHand = 0;
      let bankBalance = 0;
      let cryptoWallet: Record<string, number> = {};

      if (useNewTables) {
        // Read from new CurrencyBalance tables
        for (const balance of user.currencyBalances) {
          if (balance.currencyType === "cash" && !balance.coinType) {
            cashOnHand = balance.amount;
          } else if (balance.currencyType === "bank" && !balance.coinType) {
            bankBalance = balance.amount;
          } else if (balance.currencyType === "crypto" && balance.coinType) {
            cryptoWallet[balance.coinType] = balance.amount;
          }
        }
      } else {
        // Fallback to Character table columns
        cashOnHand = character.cashOnHand;
        bankBalance = character.bankBalance;
        cryptoWallet = typeof character.cryptoWallet === "string"
          ? JSON.parse(character.cryptoWallet)
          : character.cryptoWallet;
      }

      const balance = {
        cashOnHand,
        bankBalance,
        cryptoWallet,
        level: character.level,
      };

      // Only calculate portfolio value if requested (for better performance)
      if (includePortfolioValue) {
        let cryptoValue = 0;
        for (const [coinType, amount] of Object.entries(cryptoWallet)) {
          const price = await this.getCoinPrice(coinType);
          cryptoValue += (amount as number) * price;
        }

        return {
          ...balance,
          totalValue: cashOnHand + bankBalance + cryptoValue,
        };
      }

      return balance;
    } catch (error) {
      logger.error("Error getting user balance:", error);
      return null;
    }
  }

  /**
   * Update currency balances with hybrid write capability
   * Writes to both systems during migration phase
   */
  private async updateCurrencyBalance(
    userId: string,
    currencyType: "cash" | "bank" | "crypto",
    amount: number,
    coinType?: string
  ): Promise<void> {
    const db = DatabaseManager.getClient();

    // Always try to update new tables first
    const user = await db.user.findUnique({
      where: { discordId: userId },
      include: { currencyBalances: true, character: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const useNewTables = user.currencyBalances.length > 0;

    if (useNewTables) {
      // Update in new CurrencyBalance table
      await db.currencyBalance.upsert({
        where: {
          userId_currencyType_coinType: {
            userId: user.id,
            currencyType,
            coinType: coinType || null,
          },
        },
        update: {
          amount,
          lastUpdated: new Date(),
        },
        create: {
          userId: user.id,
          currencyType,
          coinType: coinType || null,
          amount,
        },
      });
    } else {
      // Fallback to Character table update
      const updateData: any = {};
      
      if (currencyType === "cash") {
        updateData.cashOnHand = amount;
      } else if (currencyType === "bank") {
        updateData.bankBalance = amount;
      } else if (currencyType === "crypto" && coinType) {
        const currentWallet = typeof user.character!.cryptoWallet === "string"
          ? JSON.parse(user.character!.cryptoWallet)
          : user.character!.cryptoWallet;
        
        currentWallet[coinType] = amount;
        updateData.cryptoWallet = JSON.stringify(currentWallet);
      }

      await db.character.updateMany({
        where: { userId: user.id },
        data: updateData,
      });
    }
  }

  /**
   * Get banking profile with hybrid read capability
   */
  private async getBankingProfile(userId: string): Promise<{
    accessLevel: number;
    lastVisit: Date | null;
    interestAccrued: number;
  }> {
    const db = DatabaseManager.getClient();

    const user = await db.user.findUnique({
      where: { discordId: userId },
      include: {
        bankingProfile: true,
        character: {
          select: {
            bankAccessLevel: true,
            lastBankVisit: true,
            bankInterestAccrued: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.bankingProfile) {
      return {
        accessLevel: user.bankingProfile.accessLevel,
        lastVisit: user.bankingProfile.lastVisit,
        interestAccrued: user.bankingProfile.interestAccrued,
      };
    } else {
      // Fallback to Character table
      return {
        accessLevel: user.character!.bankAccessLevel,
        lastVisit: user.character!.lastBankVisit,
        interestAccrued: user.character!.bankInterestAccrued,
      };
    }
  }

  /**
   * Update banking profile with hybrid write capability
   */
  private async updateBankingProfile(
    userId: string,
    updates: {
      accessLevel?: number;
      lastVisit?: Date;
      interestAccrued?: number;
    }
  ): Promise<void> {
    const db = DatabaseManager.getClient();

    const user = await db.user.findUnique({
      where: { discordId: userId },
      include: { bankingProfile: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.bankingProfile) {
      // Update in new BankingProfile table
      await db.bankingProfile.update({
        where: { userId: user.id },
        data: updates,
      });
    } else {
      // Fallback to Character table update
      const characterUpdates: any = {};
      
      if (updates.accessLevel !== undefined) {
        characterUpdates.bankAccessLevel = updates.accessLevel;
      }
      if (updates.lastVisit !== undefined) {
        characterUpdates.lastBankVisit = updates.lastVisit;
      }
      if (updates.interestAccrued !== undefined) {
        characterUpdates.bankInterestAccrued = updates.interestAccrued;
      }

      await db.character.updateMany({
        where: { userId: user.id },
        data: characterUpdates,
      });
    }
  }

  // ===== LEGACY API COMPATIBILITY =====

  /**
   * Legacy API: Get full balance in MoneyBalance format
   */
  async getFullBalance(userId: string): Promise<MoneyBalance | null> {
    const balance = await this.getUserBalance(userId, true);
    if (!balance) return null;

    return {
      cashOnHand: balance.cashOnHand,
      bankBalance: balance.bankBalance,
      cryptoWallet: balance.cryptoWallet,
      totalValue: balance.totalValue || 0,
    };
  }

  /**
   * Convert optimized balance to legacy MoneyBalance format
   */
  private async balanceToLegacyFormat(
    balance: {
      cashOnHand: number;
      bankBalance: number;
      cryptoWallet: Record<string, number>;
      level: number;
      totalValue?: number;
    } | null
  ): Promise<MoneyBalance | null> {
    if (!balance) return null;

    let totalValue = balance.totalValue;
    if (totalValue === undefined) {
      // Calculate crypto value if not provided
      let cryptoValue = 0;
      for (const [coinType, amount] of Object.entries(balance.cryptoWallet)) {
        const price = await this.getCoinPrice(coinType);
        cryptoValue += amount * price;
      }
      totalValue = balance.cashOnHand + balance.bankBalance + cryptoValue;
    }

    return {
      cashOnHand: balance.cashOnHand,
      bankBalance: balance.bankBalance,
      cryptoWallet: balance.cryptoWallet,
      totalValue,
    };
  }

  // ===== PLACEHOLDER METHODS =====
  // These will be implemented by copying the appropriate methods from the original MoneyService

  async getCoinPrice(coinType: string): Promise<number> {
    // TODO: Copy implementation from original MoneyService
    return 100; // Placeholder
  }

  async transferMoney(
    userId: string,
    amount: number,
    from: "cash" | "bank",
    to: "cash" | "bank"
  ): Promise<MoneyTransferResult> {
    // TODO: Copy implementation from original MoneyService with hybrid updates
    return {
      success: false,
      message: "Not implemented yet",
      error: "Placeholder method",
    };
  }

  async addMoney(
    userId: string,
    amount: number,
    type: "cash" | "bank" | "crypto",
    coinType?: string
  ): Promise<MoneyTransferResult> {
    // TODO: Copy implementation from original MoneyService with hybrid updates
    return {
      success: false,
      message: "Not implemented yet",
      error: "Placeholder method",
    };
  }
}