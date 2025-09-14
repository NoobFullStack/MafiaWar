import {
  bankTiers,
  cryptoCoins,
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
   * Get complete money balance for a user
   */
  async getUserBalance(userId: string): Promise<MoneyBalance> {
    try {
      const user = await DatabaseManager.getOrCreateUser(userId, "");
      if (!user.character) {
        throw new Error("Character not found");
      }

      const character = user.character;
      const cryptoWallet =
        typeof character.cryptoWallet === "string"
          ? JSON.parse(character.cryptoWallet)
          : character.cryptoWallet;

      // Calculate crypto portfolio value
      let cryptoValue = 0;
      for (const [coinType, amount] of Object.entries(cryptoWallet)) {
        const price = await this.getCoinPrice(coinType);
        cryptoValue += (amount as number) * price;
      }

      return {
        cashOnHand: character.cashOnHand,
        bankBalance: character.bankBalance,
        cryptoWallet: cryptoWallet,
        totalValue: character.cashOnHand + character.bankBalance + cryptoValue,
      };
    } catch (error) {
      logger.error("Error getting user balance:", error);
      throw new Error("Failed to retrieve balance");
    }
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

      const user = await DatabaseManager.getOrCreateUser(userId, "");
      if (!user.character) {
        return {
          success: false,
          message: "Character not found",
          error: "No character",
        };
      }

      const character = user.character;
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
          const maxWithdrawable = Math.floor(character.bankBalance / (1 + bankTier.benefits.withdrawalFee));
          return {
            success: false,
            message: `Insufficient bank funds. Need $${totalWithdrawal} (including $${fee} fee).\n💡 **Max you can withdraw:** $${maxWithdrawable}`,
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
            message: `Daily withdrawal limit exceeded. Limit: $${bankTier.benefits.withdrawalLimit}`,
            error: "Withdrawal limit exceeded",
          };
        }
      } else {
        // Cash deposit - use bank tier deposit fee
        fee = Math.floor(amount * bankTier.benefits.depositFee);

        if (character.cashOnHand < amount) {
          const netDeposit = Math.floor(amount * (1 - bankTier.benefits.depositFee));
          return {
            success: false,
            message: `Insufficient cash. You have $${character.cashOnHand}.\n💡 **Deposit $${character.cashOnHand} → Get:** $${Math.floor(character.cashOnHand * (1 - bankTier.benefits.depositFee))} in bank`,
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

      const newBalance = await this.getUserBalance(userId);

      return {
        success: true,
        message: `Successfully ${
          from === "cash" ? "deposited" : "withdrew"
        } $${amount}${fee > 0 ? ` (fee: $${fee})` : ""}`,
        newBalance,
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
      const coin = cryptoCoins.find((c) => c.id === coinType);
      if (!coin) {
        throw new Error(`Unknown coin type: ${coinType}`);
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
      const coin = cryptoCoins.find((c) => c.id === coinType);
      return coin?.basePrice || 1;
    }
  }

  /**
   * Buy cryptocurrency with cash
   */
  async buyCrypto(
    userId: string,
    coinType: string,
    cashAmount: number
  ): Promise<MoneyTransferResult> {
    try {
      // Input validation
      if (!userId || !coinType || !cashAmount || cashAmount <= 0) {
        return {
          success: false,
          message: "Invalid parameters provided",
          error: "Invalid input",
        };
      }

      const user = await DatabaseManager.getOrCreateUser(userId, "");
      if (!user.character) {
        return {
          success: false,
          message: "Character not found",
          error: "No character",
        };
      }

      const character = user.character;

      // Check if coin exists and user has access
      const coin = cryptoCoins.find((c) => c.id === coinType);
      if (!coin) {
        return {
          success: false,
          message: "Unknown cryptocurrency",
          error: "Invalid coin",
        };
      }

      if (coin.launchLevel && character.level < coin.launchLevel) {
        return {
          success: false,
          message: `${coin.name} requires level ${coin.launchLevel}`,
          error: "Level requirement not met",
        };
      }

      // Check cash availability
      if (character.cashOnHand < cashAmount) {
        return {
          success: false,
          message: `Insufficient cash. You have $${character.cashOnHand}`,
          error: "Insufficient funds",
        };
      }

      // Get current price and calculate fees
      const coinPrice = await this.getCoinPrice(coinType);
      const baseFee = 0.03; // 3% base exchange fee
      const fee = Math.floor(cashAmount * baseFee);
      const netAmount = cashAmount - fee;
      const coinAmount = netAmount / coinPrice;

      // Update character
      const cryptoWallet =
        typeof character.cryptoWallet === "string"
          ? JSON.parse(character.cryptoWallet)
          : character.cryptoWallet;

      cryptoWallet[coinType] = (cryptoWallet[coinType] || 0) + coinAmount;

      const db = DatabaseManager.getClient();
      await db.character.updateMany({
        where: { userId: user.id }, // Character.userId stores User.id (UUID)
        data: {
          cashOnHand: character.cashOnHand - cashAmount,
          cryptoWallet: JSON.stringify(cryptoWallet),
        },
      });

      // Log transaction
      await db.cryptoTransaction.create({
        data: {
          userId: user.id, // Use internal user.id, not Discord userId
          coinType,
          transactionType: "buy",
          amount: coinAmount,
          pricePerCoin: coinPrice,
          totalValue: cashAmount,
          fee,
          fromCurrency: "cash",
          toCurrency: coinType,
        },
      });

      const newBalance = await this.getUserBalance(userId);

      return {
        success: true,
        message: `Bought ${coinAmount.toFixed(6)} ${
          coin.symbol
        } for $${cashAmount} (fee: $${fee})`,
        newBalance,
        fees: fee,
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
   * Sell cryptocurrency for cash
   */
  async sellCrypto(
    userId: string,
    coinType: string,
    coinAmount: number
  ): Promise<MoneyTransferResult> {
    try {
      // Input validation
      if (!userId || !coinType || !coinAmount || coinAmount <= 0) {
        return {
          success: false,
          message: "Invalid parameters provided",
          error: "Invalid input",
        };
      }

      const user = await DatabaseManager.getOrCreateUser(userId, "");
      if (!user.character) {
        return {
          success: false,
          message: "Character not found",
          error: "No character",
        };
      }

      const character = user.character;
      const cryptoWallet =
        typeof character.cryptoWallet === "string"
          ? JSON.parse(character.cryptoWallet)
          : character.cryptoWallet;

      // Check if user has enough crypto
      const currentAmount = cryptoWallet[coinType] || 0;
      if (currentAmount < coinAmount) {
        return {
          success: false,
          message: `Insufficient ${coinType}. You have ${currentAmount.toFixed(
            6
          )}`,
          error: "Insufficient crypto",
        };
      }

      // Get current price and calculate values
      const coinPrice = await this.getCoinPrice(coinType);
      const grossAmount = coinAmount * coinPrice;
      const fee = Math.floor(grossAmount * 0.04); // 4% selling fee (higher than buying)
      const netCash = grossAmount - fee;

      // Update character
      cryptoWallet[coinType] = currentAmount - coinAmount;
      if (cryptoWallet[coinType] <= 0) {
        delete cryptoWallet[coinType]; // Remove empty holdings
      }

      const db = DatabaseManager.getClient();
      await db.character.updateMany({
        where: { userId: user.id }, // Character.userId stores User.id (UUID)
        data: {
          cashOnHand: character.cashOnHand + netCash,
          cryptoWallet: JSON.stringify(cryptoWallet),
        },
      });

      // Log transaction
      await db.cryptoTransaction.create({
        data: {
          userId: user.id, // Use internal user.id, not Discord userId
          coinType,
          transactionType: "sell",
          amount: coinAmount,
          pricePerCoin: coinPrice,
          totalValue: Math.floor(grossAmount),
          fee,
          fromCurrency: coinType,
          toCurrency: "cash",
        },
      });

      const newBalance = await this.getUserBalance(userId);

      return {
        success: true,
        message: `Sold ${coinAmount.toFixed(
          6
        )} ${coinType} for $${netCash} (fee: $${fee})`,
        newBalance,
        fees: fee,
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
      const user = await DatabaseManager.getOrCreateUser(userId, "");
      if (!user.character) {
        return {
          success: false,
          message: "Character not found",
          error: "No character",
        };
      }

      await db.character.updateMany({
        where: { userId: user.id }, // Character.userId stores User.id (UUID)
        data: updateData,
      });

      const newBalance = await this.getUserBalance(userId);

      return {
        success: true,
        message: `Added $${amount} to ${type} account`,
        newBalance,
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
    return cryptoCoins.filter(
      (coin) => !coin.launchLevel || playerLevel >= coin.launchLevel
    );
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
      const user = await DatabaseManager.getOrCreateUser(userId, "");
      if (!user.character) {
        return { canUpgrade: false, reason: "Character not found" };
      }

      const character = user.character;
      const currentTier = this.getUserBankTier(character.bankAccessLevel);
      const nextTier = bankTiers.find((t) => t.level === currentTier.level + 1);

      if (!nextTier) {
        return { canUpgrade: false, reason: "Already at maximum bank tier" };
      }

      const balance = await this.getUserBalance(userId);

      if (character.level < nextTier.requirements.minLevel) {
        return {
          canUpgrade: false,
          nextTier,
          reason: `Requires level ${nextTier.requirements.minLevel} (current: ${character.level})`,
        };
      }

      if (balance.totalValue < nextTier.requirements.minMoney) {
        return {
          canUpgrade: false,
          nextTier,
          reason: `Requires $${nextTier.requirements.minMoney} total wealth (current: $${balance.totalValue})`,
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
