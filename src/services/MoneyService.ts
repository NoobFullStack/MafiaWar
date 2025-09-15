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

export class MoneyService {
  private static instance: MoneyService;
  private cryptoPrices: Map<
    string,
    { price: number; change24h: number; lastUpdate: Date }
  > = new Map();

  public static getInstance(): MoneyService {
    if (!MoneyService.instance) {
      MoneyService.instance = new MoneyService();
    }
    return MoneyService.instance;
  }

  // ===== BALANCE OPERATIONS =====

  /**
   * Get user's current balances (optimized for performance with single query)
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
        },
      });

      if (!user?.character) {
        return null;
      }

      const character = user.character;
      const cryptoWallet =
        typeof character.cryptoWallet === "string"
          ? JSON.parse(character.cryptoWallet)
          : character.cryptoWallet;

      const balance = {
        cashOnHand: character.cashOnHand,
        bankBalance: character.bankBalance,
        cryptoWallet: cryptoWallet,
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
          totalValue:
            character.cashOnHand + character.bankBalance + cryptoValue,
        };
      }

      return balance;
    } catch (error) {
      logger.error("Error getting user balance:", error);
      return null;
    }
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

  /**
   * Get complete money balance for a user (legacy format for backward compatibility)
   */
  async getFullBalance(userId: string): Promise<MoneyBalance | null> {
    const balance = await this.getUserBalance(userId, true);
    return this.balanceToLegacyFormat(balance);
  }
  calculateMaxAmounts(
    balances: {
      cashOnHand: number;
      bankBalance: number;
      cryptoWallet: Record<string, number>;
    },
    coinPrice: number
  ) {
    const maxCashBuy = balances.cashOnHand > 10 ? balances.cashOnHand : 0;
    const maxBankBuy = balances.bankBalance > 10 ? balances.bankBalance : 0;

    return {
      maxCashBuy,
      maxBankBuy,
      maxCashCoinAmount: maxCashBuy > 0 ? (maxCashBuy * 0.97) / coinPrice : 0, // After 3% fee
      maxBankCoinAmount: maxBankBuy > 0 ? (maxBankBuy * 0.97) / coinPrice : 0, // After 3% fee
    };
  }

  /**
   * Transfer money between cash and bank
   */
  async transferMoney(
    userId: string,
    amount: number,
    from: "cash" | "bank",
    to: "cash" | "bank"
  ): Promise<MoneyTransferResult> {
    try {
      // Input validation
      if (!userId || typeof userId !== "string") {
        return {
          success: false,
          message: "Invalid user ID",
          error: "Invalid input",
        };
      }

      if (!amount || amount <= 0 || !Number.isInteger(amount)) {
        return {
          success: false,
          message: "Amount must be a positive integer",
          error: "Invalid amount",
        };
      }

      if (from === to) {
        return {
          success: false,
          message: "Cannot transfer to the same account",
          error: "Invalid transfer",
        };
      }

      const user = await DatabaseManager.getUserForAuth(userId);
      if (!user) {
        return {
          success: false,
          message: "Character not found - please create account first",
          error: "No character",
        };
      }

      const character = user.character!;
      const bankTier =
        bankTiers.find((t) => t.level === character.bankAccessLevel) ||
        bankTiers[0];

      // Check withdrawal limits and fees
      let fee = 0;
      if (from === "bank") {
        // Bank withdrawal
        fee = Math.floor(amount * bankTier.benefits.withdrawalFee);
        const totalWithdrawal = amount + fee;

        if (character.bankBalance < totalWithdrawal) {
          const maxWithdrawable = Math.floor(
            character.bankBalance / (1 + bankTier.benefits.withdrawalFee)
          );
          return {
            success: false,
            message: `Insufficient bank funds. Need ${BotBranding.formatCurrency(
              totalWithdrawal
            )} (including ${BotBranding.formatCurrency(
              fee
            )} fee).\n💡 **Max you can withdraw:** ${BotBranding.formatCurrency(
              maxWithdrawable
            )}`,
            error: "Insufficient funds",
          };
        }

        // Check daily withdrawal limit
        const today = new Date().toDateString();
        const lastVisit = character.lastBankVisit?.toDateString();
        // Note: In a real implementation, you'd track daily withdrawal amounts

        if (amount > bankTier.benefits.withdrawalLimit) {
          return {
            success: false,
            message: `Daily withdrawal limit exceeded. Limit: ${BotBranding.formatCurrency(
              bankTier.benefits.withdrawalLimit
            )}`,
            error: "Withdrawal limit exceeded",
          };
        }
      } else {
        // Cash deposit - use bank tier deposit fee
        fee = Math.floor(amount * bankTier.benefits.depositFee);

        if (character.cashOnHand < amount) {
          const netDeposit = Math.floor(
            amount * (1 - bankTier.benefits.depositFee)
          );
          return {
            success: false,
            message: `Insufficient cash. You have ${BotBranding.formatCurrency(
              character.cashOnHand
            )}.\n💡 **Deposit ${BotBranding.formatCurrency(
              character.cashOnHand
            )} → Get:** ${BotBranding.formatCurrency(
              Math.floor(
                character.cashOnHand * (1 - bankTier.benefits.depositFee)
              )
            )} in bank`,
            error: "Insufficient funds",
          };
        }
      }

      // Perform the transfer
      const updates: any = {
        lastBankVisit: new Date(),
      };

      if (from === "cash") {
        updates.cashOnHand = character.cashOnHand - amount;
        updates.bankBalance = character.bankBalance + amount - fee;
      } else {
        updates.bankBalance = character.bankBalance - amount - fee;
        updates.cashOnHand = character.cashOnHand + amount;
      }

      // Update database
      const db = DatabaseManager.getClient();
      await db.character.updateMany({
        where: { userId: user.id }, // Character.userId stores User.id (UUID)
        data: updates,
      });

      // Log transaction
      await db.bankTransaction.create({
        data: {
          userId: user.id, // Use internal user.id, not Discord userId
          transactionType: from === "cash" ? "deposit" : "withdrawal",
          amount,
          fee,
          balanceBefore: character.bankBalance,
          balanceAfter: updates.bankBalance,
          description: `${
            from === "cash" ? "Deposited" : "Withdrew"
          } $${amount}`,
        },
      });

      const newBalance = await this.getFullBalance(userId);

      return {
        success: true,
        message: `Successfully ${
          from === "cash" ? "deposited" : "withdrew"
        } ${BotBranding.formatCurrency(amount)}${
          fee > 0 ? ` (fee: ${BotBranding.formatCurrency(fee)})` : ""
        }`,
        newBalance: newBalance || undefined,
        fees: fee,
      };
    } catch (error) {
      logger.error("Error transferring money:", error);
      return {
        success: false,
        message: "Transfer failed",
        error: "Database error",
      };
    }
  }

  // ===== CRYPTOCURRENCY OPERATIONS =====

  /**
   * Get current price of a cryptocurrency
   */
  async getCoinPrice(coinType: string): Promise<number> {
    // Check cache first
    const cached = this.cryptoPrices.get(coinType);
    if (cached && Date.now() - cached.lastUpdate.getTime() < 300000) {
      // 5 minutes cache
      return cached.price;
    }

    try {
      // Try to get from database
      const db = DatabaseManager.getClient();
      const dbPrice = await db.cryptoPrice.findUnique({
        where: { coinType },
      });

      if (dbPrice && Date.now() - dbPrice.updatedAt.getTime() < 3600000) {
        // 1 hour cache
        this.cryptoPrices.set(coinType, {
          price: dbPrice.price,
          change24h: dbPrice.change24h,
          lastUpdate: dbPrice.updatedAt,
        });
        return dbPrice.price;
      }

      // Generate new price (in real game, this would fetch from API)
      const coin = getCryptoCoin();
      if (coinType !== coin.id) {
        throw new Error(
          `Unknown coin type: ${coinType}. Only ${coin.id} is supported.`
        );
      }

      // Simulate price fluctuation
      const lastPrice = dbPrice?.price || coin.basePrice;
      const volatility = coin.volatility;
      const change = (Math.random() - 0.5) * 2 * volatility; // -volatility to +volatility
      const newPrice = Math.max(lastPrice * (1 + change), 0.01); // Minimum price of $0.01

      // Update database
      await db.cryptoPrice.upsert({
        where: { coinType },
        update: {
          price: newPrice,
          change24h: change * 100, // Convert to percentage
          change7d: Math.random() * 20 - 10, // Random 7d change
          updatedAt: new Date(),
        },
        create: {
          coinType,
          price: newPrice,
          change24h: change * 100,
          change7d: Math.random() * 20 - 10,
          marketCap: newPrice * 1000000, // Fake market cap
          volume24h: newPrice * 10000, // Fake volume
        },
      });

      // Update cache
      this.cryptoPrices.set(coinType, {
        price: newPrice,
        change24h: change * 100,
        lastUpdate: new Date(),
      });

      return newPrice;
    } catch (error) {
      logger.error(`Error getting price for ${coinType}:`, error);
      // Return base price as fallback
      const coin = getCryptoCoin();
      return coin.basePrice;
    }
  }

  /**
   * Buy cryptocurrency with cash or bank funds
   */
  async buyCrypto(
    userId: string,
    coinType: string,
    amount: number,
    paymentMethod: "cash" | "bank" = "cash"
  ): Promise<MoneyTransferResult> {
    const startTime = Date.now();

    try {
      // Input validation
      if (!userId || !coinType || !amount || amount <= 0) {
        return {
          success: false,
          message: "Invalid parameters provided",
          error: "Invalid input",
        };
      }

      const db = DatabaseManager.getClient();

      // Single optimized query to get user and character data
      const user = await db.user.findUnique({
        where: { discordId: userId },
        include: { character: true },
      });

      if (!user?.character) {
        return {
          success: false,
          message: "Character not found",
          error: "No character",
        };
      }

      const character = user.character;

      // Validate coin and level requirements
      const coin = getCryptoCoin();
      if (coinType !== coin.id) {
        return {
          success: false,
          message: `Invalid cryptocurrency. Only ${coin.name} is supported.`,
          error: "Invalid coin",
        };
      }

      // Get current crypto price (cached)
      const coinPrice = await this.getCoinPrice(coinType);

      // Calculate transaction details
      const fee = Math.floor(amount * 0.03); // 3% fee
      const netAmount = amount - fee;
      const coinAmount = netAmount / coinPrice;

      // Check payment source and validate funds
      const sourceBalance =
        paymentMethod === "cash" ? character.cashOnHand : character.bankBalance;
      if (sourceBalance < amount) {
        return {
          success: false,
          message: `Insufficient ${paymentMethod}. Need ${BotBranding.formatCurrency(
            amount
          )}, have ${BotBranding.formatCurrency(sourceBalance)}`,
          error: "Insufficient funds",
        };
      }

      // Parse current crypto wallet
      const cryptoWallet =
        typeof character.cryptoWallet === "string"
          ? JSON.parse(character.cryptoWallet)
          : character.cryptoWallet;

      // Update crypto holdings
      cryptoWallet[coinType] = (cryptoWallet[coinType] || 0) + coinAmount;

      // Prepare update data
      const updateData: any = {
        cryptoWallet: JSON.stringify(cryptoWallet),
      };

      if (paymentMethod === "cash") {
        updateData.cashOnHand = character.cashOnHand - amount;
      } else {
        updateData.bankBalance = character.bankBalance - amount;
      }

      // Single atomic update
      await db.character.updateMany({
        where: { userId: user.id },
        data: updateData,
      });

      // Log transaction asynchronously (don't wait for completion)
      setImmediate(async () => {
        try {
          await db.cryptoTransaction.create({
            data: {
              userId: user.id,
              coinType,
              transactionType: "buy",
              amount: coinAmount,
              pricePerCoin: coinPrice,
              totalValue: amount,
              fee,
              fromCurrency: paymentMethod,
              toCurrency: coinType,
            },
          });
        } catch (logError) {
          logger.warn("Failed to log crypto transaction:", logError);
        }
      });

      const endTime = Date.now();
      logger.info(`Crypto buy completed in ${endTime - startTime}ms`);

      return {
        success: true,
        message: `Bought ${coinAmount.toFixed(6)} ${
          coin.symbol
        } for ${BotBranding.formatCurrency(amount)}`,
        fees: fee,
        data: {
          amountProcessed: amount,
          fees: fee,
          coinAmount,
          fromBalance: sourceBalance - amount,
          toBalance: sourceBalance - amount,
          cryptoBalance: cryptoWallet,
        },
      };
    } catch (error) {
      logger.error("Error buying crypto:", error);
      return {
        success: false,
        message: "Purchase failed",
        error: "Database error",
      };
    }
  }

  /**
   * Sell cryptocurrency for cash or bank deposit
   */
  async sellCrypto(
    userId: string,
    coinType: string,
    coinAmount: number,
    depositTo: "cash" | "bank" = "cash"
  ): Promise<MoneyTransferResult> {
    const startTime = Date.now();

    try {
      // Input validation
      if (!userId || !coinType || !coinAmount || coinAmount <= 0) {
        return {
          success: false,
          message: "Invalid parameters provided",
          error: "Invalid input",
        };
      }

      const db = DatabaseManager.getClient();

      // Single optimized query to get user and character data
      const user = await db.user.findUnique({
        where: { discordId: userId },
        include: { character: true },
      });

      if (!user?.character) {
        return {
          success: false,
          message: "Character not found",
          error: "No character",
        };
      }

      const character = user.character;

      // Parse current crypto wallet
      const cryptoWallet =
        typeof character.cryptoWallet === "string"
          ? JSON.parse(character.cryptoWallet)
          : character.cryptoWallet;

      // Check holdings
      const currentHolding = cryptoWallet[coinType] || 0;
      if (currentHolding < coinAmount) {
        return {
          success: false,
          message: `Insufficient ${coinType}. Have ${currentHolding.toFixed(
            6
          )}, trying to sell ${coinAmount.toFixed(6)}`,
          error: "Insufficient crypto",
        };
      }

      // Get current crypto price (cached)
      const coinPrice = await this.getCoinPrice(coinType);

      // Calculate transaction details
      const grossAmount = coinAmount * coinPrice;
      const fee = Math.floor(grossAmount * 0.04); // 4% selling fee
      const netCash = grossAmount - fee;

      // Update crypto holdings
      cryptoWallet[coinType] = currentHolding - coinAmount;
      if (cryptoWallet[coinType] <= 0) {
        delete cryptoWallet[coinType]; // Remove empty holdings
      }

      // Prepare update data
      const updateData: any = {
        cryptoWallet: JSON.stringify(cryptoWallet),
      };

      const originalBalance =
        depositTo === "cash" ? character.cashOnHand : character.bankBalance;

      if (depositTo === "cash") {
        updateData.cashOnHand = character.cashOnHand + netCash;
      } else {
        updateData.bankBalance = character.bankBalance + netCash;
      }

      // Single atomic update
      await db.character.updateMany({
        where: { userId: user.id },
        data: updateData,
      });

      // Log transaction asynchronously (don't wait for completion)
      setImmediate(async () => {
        try {
          await db.cryptoTransaction.create({
            data: {
              userId: user.id,
              coinType,
              transactionType: "sell",
              amount: coinAmount,
              pricePerCoin: coinPrice,
              totalValue: Math.floor(grossAmount),
              fee,
              fromCurrency: coinType,
              toCurrency: depositTo,
            },
          });
        } catch (logError) {
          logger.warn("Failed to log crypto transaction:", logError);
        }
      });

      const endTime = Date.now();
      logger.info(`Crypto sell completed in ${endTime - startTime}ms`);

      return {
        success: true,
        message: `Sold ${coinAmount.toFixed(
          6
        )} ${coinType} for ${BotBranding.formatCurrency(netCash)}`,
        fees: fee,
        data: {
          amountProcessed: Math.floor(grossAmount),
          fees: fee,
          coinAmount: coinAmount,
          fromBalance: originalBalance,
          toBalance: originalBalance + netCash,
          cryptoBalance: cryptoWallet,
        },
      };
    } catch (error) {
      logger.error("Error selling crypto:", error);
      return {
        success: false,
        message: "Sale failed",
        error: "Database error",
      };
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Add money directly to user account (used for crime payouts, no fees)
   */
  async addMoney(
    userId: string,
    amount: number,
    type: "cash" | "bank" | "crypto",
    coinType?: string
  ): Promise<MoneyTransferResult> {
    try {
      if (!userId || amount <= 0) {
        return {
          success: false,
          message: "Invalid parameters",
          error: "Invalid input",
        };
      }

      const db = DatabaseManager.getClient();
      const updateData: any = {};

      switch (type) {
        case "cash":
          updateData.cashOnHand = { increment: amount };
          break;
        case "bank":
          updateData.bankBalance = { increment: amount };
          break;
        case "crypto":
          if (!coinType) {
            return {
              success: false,
              message: "Coin type required for crypto payment",
              error: "Missing coin type",
            };
          }
          // For crypto, we add cash then convert (to maintain price consistency)
          return await this.buyCrypto(userId, coinType, amount);
      }

      // Get user to find character
      const user = await DatabaseManager.getUserForAuth(userId);
      if (!user) {
        return {
          success: false,
          message: "Character not found - please create account first",
          error: "No character",
        };
      }

      await db.character.updateMany({
        where: { userId: user.id }, // Character.userId stores User.id (UUID)
        data: updateData,
      });

      const newBalance = await this.getFullBalance(userId);

      return {
        success: true,
        message: `Added $${amount} to ${type} account`,
        newBalance: newBalance || undefined,
      };
    } catch (error) {
      logger.error("Error adding money:", error);
      return {
        success: false,
        message: "Failed to add money",
        error: "Database error",
      };
    }
  }

  /**
   * Get available cryptocurrencies for user's level
   */
  getAvailableCoins(playerLevel: number): CryptoCoin[] {
    const coin = getCryptoCoin();
    // Since we only have one coin and it's available at level 1, always return it
    return [coin];
  }

  /**
   * Get user's bank tier information
   */
  getUserBankTier(bankAccessLevel: number): BankTier {
    return bankTiers.find((t) => t.level === bankAccessLevel) || bankTiers[0];
  }

  /**
   * Check if user can upgrade bank access
   */
  async canUpgradeBank(
    userId: string
  ): Promise<{ canUpgrade: boolean; nextTier?: BankTier; reason?: string }> {
    try {
      const user = await DatabaseManager.getUserForAuth(userId);
      if (!user) {
        return {
          canUpgrade: false,
          reason: "Character not found - please create account first",
        };
      }

      const character = user.character!;
      const currentTier = this.getUserBankTier(character.bankAccessLevel);
      const nextTier = bankTiers.find((t) => t.level === currentTier.level + 1);

      if (!nextTier) {
        return { canUpgrade: false, reason: "Already at maximum bank tier" };
      }

      const balance = await this.getUserBalance(userId, true);
      if (!balance) {
        return { canUpgrade: false, reason: "Character not found" };
      }

      if (character.level < nextTier.requirements.minLevel) {
        return {
          canUpgrade: false,
          nextTier,
          reason: `Requires level ${nextTier.requirements.minLevel} (current: ${character.level})`,
        };
      }

      const totalValue = balance.totalValue || 0;
      if (totalValue < nextTier.requirements.minMoney) {
        return {
          canUpgrade: false,
          nextTier,
          reason: `Requires $${nextTier.requirements.minMoney} total wealth (current: $${totalValue})`,
        };
      }

      if (
        nextTier.requirements.reputation &&
        character.reputation < nextTier.requirements.reputation
      ) {
        return {
          canUpgrade: false,
          nextTier,
          reason: `Requires ${nextTier.requirements.reputation} reputation (current: ${character.reputation})`,
        };
      }

      if (character.cashOnHand < nextTier.upgradeCost) {
        return {
          canUpgrade: false,
          nextTier,
          reason: `Requires $${nextTier.upgradeCost} cash for upgrade fee (current: $${character.cashOnHand})`,
        };
      }

      return { canUpgrade: true, nextTier };
    } catch (error) {
      logger.error("Error checking bank upgrade:", error);
      return { canUpgrade: false, reason: "Error checking requirements" };
    }
  }
}

export default MoneyService;
