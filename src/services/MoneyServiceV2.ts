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

    // Get user info to determine which system to use
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
          : user.character!.cryptoWallet || {};
        
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

  // ===== CRYPTOCURRENCY OPERATIONS =====

  /**
   * Get current price of a cryptocurrency
   */
  async getCoinPrice(coinType: string): Promise<number> {
    // Always use "crypto" as the standard key for database operations
    const standardCoinType = "crypto";

    // Check cache first
    const cached = this.cryptoPrices.get(coinType);
    if (cached && Date.now() - cached.lastUpdate.getTime() < 300000) {
      // 5 minutes cache
      return cached.price;
    }

    try {
      // Try to get from database - always use "crypto" as the standard key
      const db = DatabaseManager.getClient();
      const dbPrice = await db.cryptoPrice.findUnique({
        where: { coinType: standardCoinType },
      });

      if (dbPrice && Date.now() - dbPrice.updatedAt.getTime() < 3600000) {
        // 1 hour cache - set cache for both standard key and requested key
        const cacheData = {
          price: dbPrice.price,
          change24h: dbPrice.change24h,
          lastUpdate: dbPrice.updatedAt,
        };
        this.cryptoPrices.set(standardCoinType, cacheData);
        this.cryptoPrices.set(coinType, cacheData);
        return dbPrice.price;
      }

      // Generate new price (in real game, this would fetch from API)
      const coin = getCryptoCoin();
      // Accept both coin ID and symbol for backward compatibility
      if (
        coinType !== coin.id &&
        coinType !== coin.symbol &&
        coinType !== "crypto"
      ) {
        throw new Error(
          `Unknown coin type: ${coinType}. Only ${coin.symbol} (${coin.name}) is supported.`
        );
      }

      // Simulate price fluctuation
      const lastPrice = dbPrice?.price || coin.basePrice;
      const volatility = coin.volatility;
      const change = (Math.random() - 0.5) * 2 * volatility; // -volatility to +volatility
      const newPrice = Math.max(lastPrice * (1 + change), 0.01); // Minimum price of $0.01

      // Update database
      await db.cryptoPrice.upsert({
        where: { coinType: standardCoinType },
        update: {
          price: newPrice,
          change24h: change * 100, // Convert to percentage
          change7d: Math.random() * 20 - 10, // Random 7d change
          updatedAt: new Date(),
        },
        create: {
          coinType: standardCoinType,
          price: newPrice,
          change24h: change * 100,
          change7d: Math.random() * 20 - 10,
          marketCap: newPrice * 1000000, // Fake market cap
          volume24h: newPrice * 10000, // Fake volume
        },
      });

      // Update cache with both standard key and requested key for compatibility
      const cacheData = {
        price: newPrice,
        change24h: change * 100,
        lastUpdate: new Date(),
      };
      this.cryptoPrices.set(standardCoinType, cacheData);
      this.cryptoPrices.set(coinType, cacheData);

      return newPrice;
    } catch (error) {
      logger.error(`Error getting price for ${coinType}:`, error);
      // Return base price as fallback
      const coin = getCryptoCoin();
      return coin.basePrice;
    }
  }

  /**
   * Transfer money between cash and bank with hybrid system support
   */
  async transferMoney(
    userId: string,
    amount: number,
    from: "cash" | "bank",
    to: "cash" | "bank"
  ): Promise<MoneyTransferResult> {
    try {
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

      // Get current balances and banking profile
      const balance = await this.getUserBalance(userId);
      const bankingProfile = await this.getBankingProfile(userId);
      
      if (!balance) {
        return {
          success: false,
          message: "Could not retrieve balance",
          error: "No balance data",
        };
      }

      const bankTier =
        bankTiers.find((t) => t.level === bankingProfile.accessLevel) ||
        bankTiers[0];

      // Check withdrawal limits and fees
      let fee = 0;
      if (from === "bank") {
        // Bank withdrawal
        fee = Math.floor(amount * bankTier.benefits.withdrawalFee);
        const totalWithdrawal = amount + fee;

        if (balance.bankBalance < totalWithdrawal) {
          const maxWithdrawable = Math.floor(
            balance.bankBalance / (1 + bankTier.benefits.withdrawalFee)
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

        if (balance.cashOnHand < amount) {
          return {
            success: false,
            message: `Insufficient cash. You have ${BotBranding.formatCurrency(
              balance.cashOnHand
            )}.`,
            error: "Insufficient funds",
          };
        }
      }

      // Perform the transfer using hybrid system
      const db = DatabaseManager.getClient();

      await db.$transaction(async (tx: any) => {
        if (from === "cash") {
          // Deposit: cash -> bank
          await this.updateCurrencyBalance(userId, "cash", balance.cashOnHand - amount);
          await this.updateCurrencyBalance(userId, "bank", balance.bankBalance + amount - fee);
        } else {
          // Withdrawal: bank -> cash
          await this.updateCurrencyBalance(userId, "bank", balance.bankBalance - amount - fee);
          await this.updateCurrencyBalance(userId, "cash", balance.cashOnHand + amount);
        }

        // Update banking profile
        await this.updateBankingProfile(userId, {
          lastVisit: new Date(),
        });

        // Log transaction
        await tx.bankTransaction.create({
          data: {
            userId: user.id,
            transactionType: from === "cash" ? "deposit" : "withdrawal",
            amount,
            fee,
            balanceBefore: balance.bankBalance,
            balanceAfter: from === "cash" ? balance.bankBalance + amount - fee : balance.bankBalance - amount - fee,
            description: `${
              from === "cash" ? "Deposited" : "Withdrew"
            } $${amount}`,
          },
        });
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

  /**
   * Add money directly to user account with hybrid system support
   */
  async addMoney(
    userId: string,
    amount: number,
    type: "cash" | "bank" | "crypto",
    coinType?: string
  ): Promise<MoneyTransferResult> {
    try {
      if (!userId || typeof userId !== "string") {
        return {
          success: false,
          message: "Invalid user ID",
          error: "Invalid input",
        };
      }

      if (!amount || amount <= 0) {
        return {
          success: false,
          message: "Amount must be positive",
          error: "Invalid amount",
        };
      }

      if (type === "crypto" && !coinType) {
        return {
          success: false,
          message: "Coin type required for cryptocurrency",
          error: "Missing coin type",
        };
      }

      // Special handling for crypto - convert cash to crypto
      if (type === "crypto" && coinType) {
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

      // Get current balance
      const balance = await this.getUserBalance(userId);
      if (!balance) {
        return {
          success: false,
          message: "Could not retrieve balance",
          error: "No balance data",
        };
      }

      // Update the specific currency type
      if (type === "cash") {
        await this.updateCurrencyBalance(userId, "cash", balance.cashOnHand + amount);
      } else if (type === "bank") {
        await this.updateCurrencyBalance(userId, "bank", balance.bankBalance + amount);
      }

      const newBalance = await this.getFullBalance(userId);

      return {
        success: true,
        message: `Added ${BotBranding.formatCurrency(amount)} to ${type}`,
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
   * Buy cryptocurrency with cash or bank funds (hybrid system support)
   */
  async buyCrypto(
    userId: string,
    coinType: string,
    amount: number,
    paymentMethod: "cash" | "bank" = "cash"
  ): Promise<MoneyTransferResult> {
    const startTime = Date.now();

    try {
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

      const user = await DatabaseManager.getUserForAuth(userId);
      if (!user) {
        return {
          success: false,
          message: "Character not found - please create account first",
          error: "No character",
        };
      }

      // Get current balance
      const balance = await this.getUserBalance(userId);
      if (!balance) {
        return {
          success: false,
          message: "Could not retrieve balance",
          error: "No balance data",
        };
      }

      // Validate coin and level requirements
      const coin = getCryptoCoin();
      if (coinType !== coin.id && coinType !== coin.symbol) {
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
        paymentMethod === "cash" ? balance.cashOnHand : balance.bankBalance;
      if (sourceBalance < amount) {
        return {
          success: false,
          message: `Insufficient ${paymentMethod}. Need ${BotBranding.formatCurrency(
            amount
          )}, have ${BotBranding.formatCurrency(sourceBalance)}`,
          error: "Insufficient funds",
        };
      }

      // Update balances using hybrid system
      const db = DatabaseManager.getClient();

      await db.$transaction(async (tx: any) => {
        // Deduct payment
        if (paymentMethod === "cash") {
          await this.updateCurrencyBalance(userId, "cash", balance.cashOnHand - amount);
        } else {
          await this.updateCurrencyBalance(userId, "bank", balance.bankBalance - amount);
        }

        // Add crypto
        const currentCrypto = balance.cryptoWallet[coinType] || 0;
        await this.updateCurrencyBalance(userId, "crypto", currentCrypto + coinAmount, coinType);

        // Log transaction
        await tx.cryptoTransaction.create({
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
          cryptoBalance: { ...balance.cryptoWallet, [coinType]: (balance.cryptoWallet[coinType] || 0) + coinAmount },
        },
      };
    } catch (error) {
      logger.error("Error buying crypto:", error);
      const endTime = Date.now();
      logger.warn(`Crypto buy failed in ${endTime - startTime}ms`);

      return {
        success: false,
        message: "Crypto purchase failed",
        error: "Database error",
      };
    }
  }

  // ===== MISSING METHODS FROM ORIGINAL SERVICE =====

  /**
   * Calculate maximum amounts for crypto purchase
   */
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
      maxCashCoins: maxCashBuy > 0 ? maxCashBuy / coinPrice : 0,
      maxBankCoins: maxBankBuy > 0 ? maxBankBuy / coinPrice : 0,
    };
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

      const bankingProfile = await this.getBankingProfile(userId);
      const currentTier = this.getUserBankTier(bankingProfile.accessLevel);
      const nextTier = bankTiers.find((t) => t.level === currentTier.level + 1);

      if (!nextTier) {
        return { canUpgrade: false, reason: "Already at maximum bank tier" };
      }

      const balance = await this.getUserBalance(userId, true);
      if (!balance) {
        return { canUpgrade: false, reason: "Character not found" };
      }

      if (balance.level < nextTier.requirements.minLevel) {
        return {
          canUpgrade: false,
          reason: `Requires level ${nextTier.requirements.minLevel}`,
        };
      }

      if ((balance.totalValue || 0) < nextTier.requirements.minNetWorth) {
        return {
          canUpgrade: false,
          reason: `Requires ${BotBranding.formatCurrency(
            nextTier.requirements.minNetWorth
          )} net worth`,
        };
      }

      return { canUpgrade: true, nextTier };
    } catch (error) {
      logger.error("Error checking bank upgrade eligibility:", error);
      return { canUpgrade: false, reason: "Service error" };
    }
  }

  /**
   * Sell cryptocurrency for cash or bank funds
   */
  async sellCrypto(
    userId: string,
    coinType: string,
    amount: number,
    targetCurrency: "cash" | "bank" = "cash"
  ): Promise<MoneyTransferResult> {
    const startTime = Date.now();

    try {
      if (!userId || typeof userId !== "string") {
        return {
          success: false,
          message: "Invalid user ID",
          error: "Invalid input",
        };
      }

      if (!amount || amount <= 0) {
        return {
          success: false,
          message: "Amount must be positive",
          error: "Invalid amount",
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

      // Get current balance
      const balance = await this.getUserBalance(userId);
      if (!balance) {
        return {
          success: false,
          message: "Could not retrieve balance",
          error: "No balance data",
        };
      }

      // Validate coin and check holdings
      const coin = getCryptoCoin();
      if (coinType !== coin.id && coinType !== coin.symbol) {
        return {
          success: false,
          message: `Invalid cryptocurrency. Only ${coin.name} is supported.`,
          error: "Invalid coin",
        };
      }

      const currentHoldings = balance.cryptoWallet[coinType] || 0;
      if (currentHoldings < amount) {
        return {
          success: false,
          message: `Insufficient ${coin.symbol}. You have ${currentHoldings.toFixed(
            6
          )}, need ${amount.toFixed(6)}`,
          error: "Insufficient crypto",
        };
      }

      // Get current crypto price
      const coinPrice = await this.getCoinPrice(coinType);

      // Calculate transaction details
      const grossValue = amount * coinPrice;
      const fee = Math.floor(grossValue * 0.03); // 3% fee
      const netValue = grossValue - fee;

      // Update balances using hybrid system
      const db = DatabaseManager.getClient();

      await db.$transaction(async (tx: any) => {
        // Remove crypto
        await this.updateCurrencyBalance(userId, "crypto", currentHoldings - amount, coinType);

        // Add cash or bank
        if (targetCurrency === "cash") {
          await this.updateCurrencyBalance(userId, "cash", balance.cashOnHand + netValue);
        } else {
          await this.updateCurrencyBalance(userId, "bank", balance.bankBalance + netValue);
        }

        // Log transaction
        await tx.cryptoTransaction.create({
          data: {
            userId: user.id,
            coinType,
            transactionType: "sell",
            amount: amount,
            pricePerCoin: coinPrice,
            totalValue: grossValue,
            fee,
            fromCurrency: coinType,
            toCurrency: targetCurrency,
          },
        });
      });

      const endTime = Date.now();
      logger.info(`Crypto sell completed in ${endTime - startTime}ms`);

      return {
        success: true,
        message: `Sold ${amount.toFixed(6)} ${
          coin.symbol
        } for ${BotBranding.formatCurrency(netValue)}`,
        fees: fee,
        data: {
          amountProcessed: grossValue,
          fees: fee,
          coinAmount: amount,
          fromBalance: currentHoldings - amount,
          toBalance: targetCurrency === "cash" ? balance.cashOnHand + netValue : balance.bankBalance + netValue,
          cryptoBalance: { ...balance.cryptoWallet, [coinType]: currentHoldings - amount },
        },
      };
    } catch (error) {
      logger.error("Error selling crypto:", error);
      const endTime = Date.now();
      logger.warn(`Crypto sell failed in ${endTime - startTime}ms`);

      return {
        success: false,
        message: "Crypto sale failed",
        error: "Database error",
      };
    }
  }
}

// Export as both named and default for compatibility
export { MoneyServiceV2 };
export default MoneyServiceV2;