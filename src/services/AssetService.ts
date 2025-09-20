/**
 * ASSET SERVICE
 *
 * Handles all asset management including:
 * - Asset income generation with strategic money distribution
 * - Purchase validation and requirements checking
 * - Upgrade mechanics and cost calculations
 * - Income collection with proper 3-layered money system integration
 * - Asset security and raid mechanics
 */

import { BotBranding } from "../config/bot";
import { AssetTemplate, assetTemplates } from "../data/assets";
import DatabaseManager from "../utils/DatabaseManager";
import { PlayerProgress } from "../utils/LevelGateValidator";
import { logger } from "../utils/ResponseUtil";
import { MoneyService } from "./MoneyService";

export interface AssetPurchaseResult {
  success: boolean;
  message: string;
  asset?: {
    id: string;
    name: string;
    type: string;
    incomeRate: number;
    securityLevel: number;
  };
  cost?: number;
  error?: string;
}

export interface AssetIncomeResult {
  success: boolean;
  message: string;
  totalIncome?: number;
  incomeBreakdown?: {
    cash: number;
    bank: number;
    crypto: { [coinType: string]: number };
  };
  assetsCollected?: number;
  error?: string;
}

export interface AssetInfo {
  id: string;
  name: string;
  type: string;
  level: number;
  incomeRate: number;
  securityLevel: number;
  value: number;
  lastIncomeTime: Date;
  template: AssetTemplate;
  pendingIncome: number;
  pendingIncomeBreakdown: {
    cash: number;
    bank: number;
    crypto: { [coinType: string]: number };
  };
}

export class AssetService {
  private static instance: AssetService;
  private moneyService: MoneyService;

  constructor() {
    this.moneyService = MoneyService.getInstance();
  }

  public static getInstance(): AssetService {
    if (!AssetService.instance) {
      AssetService.instance = new AssetService();
    }
    return AssetService.instance;
  }

  // ===== ASSET BROWSING =====

  /**
   * Get all available assets for a player's level
   */
  getAvailableAssets(
    playerLevel: number,
    playerReputation: number,
    playerMoney: number
  ): AssetTemplate[] {
    return assetTemplates.filter((asset) => {
      const levelReq = asset.requirements?.level || 1;
      const repReq = asset.requirements?.reputation || 0;
      const moneyReq = asset.requirements?.money || 0;

      return (
        playerLevel >= levelReq &&
        playerReputation >= repReq &&
        playerMoney >= moneyReq + asset.basePrice // Can afford requirement + purchase price
      );
    });
  }

  /**
   * Get asset template by ID
   */
  getAssetTemplate(assetId: string): AssetTemplate | null {
    return assetTemplates.find((asset) => asset.id === assetId) || null;
  }

  /**
   * Validate if player can purchase a specific asset
   */
  async validateAssetPurchase(
    userId: string,
    assetId: string
  ): Promise<{
    canPurchase: boolean;
    reason?: string;
    requirements: string[];
  }> {
    const asset = this.getAssetTemplate(assetId);
    if (!asset) {
      return {
        canPurchase: false,
        reason: "Asset not found",
        requirements: [],
      };
    }

    // Get player data
    const user = await DatabaseManager.getUserForAuth(userId);
    if (!user?.character) {
      return {
        canPurchase: false,
        reason: "Character not found",
        requirements: [],
      };
    }

    const player: PlayerProgress = {
      level: user.character.level,
      experience: user.character.experience,
      reputation: user.character.reputation,
      stats:
        typeof user.character.stats === "string"
          ? JSON.parse(user.character.stats)
          : user.character.stats,
      money: user.character.cashOnHand + user.character.bankBalance,
    };

    // Use LevelGateValidator for requirement checking
    const requirements: string[] = [];
    const missing: string[] = [];
    let canPurchase = true;

    // Check level requirement
    if (asset.requirements?.level && player.level < asset.requirements.level) {
      requirements.push(`Level ${asset.requirements.level}`);
      missing.push(
        `Level ${asset.requirements.level} (current: ${player.level})`
      );
      canPurchase = false;
    }

    // Check reputation requirement
    if (
      asset.requirements?.reputation &&
      (player.reputation || 0) < asset.requirements.reputation
    ) {
      requirements.push(`${asset.requirements.reputation} reputation`);
      missing.push(
        `${asset.requirements.reputation} reputation (current: ${
          player.reputation || 0
        })`
      );
      canPurchase = false;
    }

    // Additional check for total purchase cost
    const totalCost = asset.basePrice + (asset.requirements?.money || 0);
    const playerBalance = await this.moneyService.getUserBalance(userId);

    if (!playerBalance) {
      return {
        canPurchase: false,
        reason: "Could not fetch balance",
        requirements: [],
      };
    }

    const availableFunds = playerBalance.cashOnHand + playerBalance.bankBalance;

    if (availableFunds < totalCost) {
      missing.push(
        `${BotBranding.formatCurrency(totalCost)} total (have ${BotBranding.formatCurrency(availableFunds)})`
      );
      return {
        canPurchase: false,
        reason: `Insufficient funds - need ${BotBranding.formatCurrency(totalCost)}, have ${BotBranding.formatCurrency(availableFunds)}`,
        requirements: missing,
      };
    }

    return {
      canPurchase,
      reason: missing.length > 0 ? missing.join(", ") : undefined,
      requirements: missing,
    };
  }

  // ===== ASSET PURCHASING =====

  /**
   * Purchase an asset for a player
   */
  async purchaseAsset(
    userId: string,
    assetId: string,
    paymentMethod: "cash" | "bank" | "mixed" = "mixed"
  ): Promise<AssetPurchaseResult> {
    try {
      const asset = this.getAssetTemplate(assetId);
      if (!asset) {
        return {
          success: false,
          message: "Asset not found",
          error: "Invalid asset ID",
        };
      }

      // Validate purchase requirements
      const validation = await this.validateAssetPurchase(userId, assetId);
      if (!validation.canPurchase) {
        return {
          success: false,
          message: `Cannot purchase ${asset.name}: ${validation.reason}`,
          error: "Requirements not met",
        };
      }

      const db = DatabaseManager.getClient();
      const user = await DatabaseManager.getUserForAuth(userId);

      if (!user?.character) {
        return {
          success: false,
          message: "Character not found",
          error: "No character",
        };
      }

      // Process entire purchase in a single transaction to prevent race conditions
      const result = await db.$transaction(
        async (tx) => {
          // Re-validate within transaction to prevent race conditions
          const currentUser = await tx.user.findUnique({
            where: { id: user.id },
            include: { character: true },
          });

          if (!currentUser?.character) {
            throw new Error("Character not found");
          }

          const totalCost = asset.basePrice;

          // Check payment availability within transaction
          switch (paymentMethod) {
            case "cash":
              if (currentUser.character.cashOnHand < totalCost) {
                throw new Error(
                  `Insufficient cash - need ${BotBranding.formatCurrency(totalCost)}, have ${BotBranding.formatCurrency(currentUser.character.cashOnHand)}`
                );
              }
              // Deduct from cash
              await tx.character.updateMany({
                where: { userId: user.id },
                data: { cashOnHand: { decrement: totalCost } },
              });
              break;

            case "bank":
              if (currentUser.character.bankBalance < totalCost) {
                throw new Error(
                  `Insufficient bank funds - need ${BotBranding.formatCurrency(totalCost)}, have ${BotBranding.formatCurrency(currentUser.character.bankBalance)}`
                );
              }
              // Deduct from bank
              await tx.character.updateMany({
                where: { userId: user.id },
                data: { bankBalance: { decrement: totalCost } },
              });
              break;

            case "mixed":
              // Try to use bank first, then cash
              const bankAmount = Math.min(
                currentUser.character.bankBalance,
                totalCost
              );
              const cashAmount = totalCost - bankAmount;

              if (cashAmount > currentUser.character.cashOnHand) {
                throw new Error(
                  `Insufficient funds - need ${BotBranding.formatCurrency(totalCost)}, have ${BotBranding.formatCurrency(
                    currentUser.character.cashOnHand +
                    currentUser.character.bankBalance
                  )}`
                );
              }

              // Process mixed payment
              if (bankAmount > 0) {
                await tx.character.updateMany({
                  where: { userId: user.id },
                  data: { bankBalance: { decrement: bankAmount } },
                });
              }
              if (cashAmount > 0) {
                await tx.character.updateMany({
                  where: { userId: user.id },
                  data: { cashOnHand: { decrement: cashAmount } },
                });
              }
              break;
          }

          // Create the asset
          const newAsset = await tx.asset.create({
            data: {
              ownerId: user.id,
              type: asset.type,
              name: asset.name,
              level: 1,
              incomeRate: asset.baseIncomeRate,
              securityLevel: asset.baseSecurityLevel,
              value: asset.basePrice,
              lastIncomeTime: new Date(),
            },
          });

          // Log the purchase
          await tx.actionLog.create({
            data: {
              userId: user.id,
              actionType: "asset_purchase",
              actionId: newAsset.id,
              result: "success",
              details: {
                assetId: asset.id,
                assetName: asset.name,
                cost: totalCost,
                paymentMethod,
              },
            },
          });

          return {
            newAsset,
            totalCost,
          };
        },
        {
          timeout: 10000, // 10 second timeout for purchase transaction
        }
      );

      return {
        success: true,
        message: `🏢 Successfully purchased ${asset.name}!`,
        asset: {
          id: result.newAsset.id,
          name: asset.name,
          type: asset.type,
          incomeRate: asset.baseIncomeRate,
          securityLevel: asset.baseSecurityLevel,
        },
        cost: result.totalCost,
      };
    } catch (error: any) {
      logger.error("Error purchasing asset:", error);

      // Handle specific transaction errors
      if (
        error.message &&
        (error.message.includes("Insufficient") ||
          error.message.includes("need $") ||
          error.message.includes("have $"))
      ) {
        return {
          success: false,
          message: error.message,
          error: "Insufficient funds",
        };
      }

      return {
        success: false,
        message: "Failed to purchase asset. Please try again.",
        error: "Database error",
      };
    }
  }

  // ===== INCOME GENERATION =====

  /**
   * Calculate pending income for an asset based on time elapsed
   */
  calculatePendingIncome(
    asset: any,
    template: AssetTemplate
  ): {
    totalIncome: number;
    breakdown: {
      cash: number;
      bank: number;
      crypto: { [coinType: string]: number };
    };
  } {
    const hoursElapsed = Math.max(
      0,
      (Date.now() - new Date(asset.lastIncomeTime).getTime()) / (1000 * 60 * 60)
    );

    // Minimum collection time of 15 minutes to prevent spam clicking
    if (hoursElapsed < 0.25) {
      // 0.25 hours = 15 minutes
      return {
        totalIncome: 0,
        breakdown: { cash: 0, bank: 0, crypto: {} },
      };
    }

    // Cap at 1 hour to prevent infinite accumulation - users must actively collect
    const cappedHours = Math.min(hoursElapsed, 1.0);
    const baseIncome = Math.floor(asset.incomeRate * cappedHours);

    // Apply characteristics modifiers
    let modifiedIncome = baseIncome;

    if (template.characteristics?.seasonality) {
      modifiedIncome *= template.characteristics.seasonality;
    }

    // Calculate distribution with proper rounding to avoid losing small amounts
    const distribution = template.incomeDistribution;

    // Use more precise calculation for small amounts
    const cashAmount = Math.round(modifiedIncome * (distribution.cash / 100));
    const bankAmount = Math.round(modifiedIncome * (distribution.bank / 100));
    const cryptoPercent = distribution.crypto / 100;
    const cryptoAmount = Math.max(0, modifiedIncome - cashAmount - bankAmount);

    const breakdown = {
      cash: cashAmount,
      bank: bankAmount,
      crypto: {} as { [coinType: string]: number },
    };

    // Distribute crypto income
    if (cryptoAmount > 0 && distribution.crypto > 0) {
      const cryptoType = distribution.cryptoType || "crypto";
      breakdown.crypto[cryptoType] = cryptoAmount;
    }

    return {
      totalIncome: modifiedIncome,
      breakdown,
    };
  }

  /**
   * Collect income from all player's assets
   */
  async collectAllIncome(userId: string): Promise<AssetIncomeResult> {
    try {
      const db = DatabaseManager.getClient();
      const user = await DatabaseManager.getUserForAuth(userId);

      if (!user) {
        return {
          success: false,
          message: "Character not found",
          error: "No character",
        };
      }

      // Get all user's assets
      const assets = await db.asset.findMany({
        where: { ownerId: user.id },
      });

      if (assets.length === 0) {
        return {
          success: false,
          message:
            "You don't own any assets yet! Use `/assets` to browse available businesses.",
          error: "No assets",
        };
      }

      let totalCash = 0;
      let totalBank = 0;
      let totalCryptoDollars: { [coinType: string]: number } = {}; // Store dollar amounts first
      let totalIncome = 0;
      let assetsWithIncome = 0;
      let assetsWithoutIncome: string[] = [];
      let nextIncomeInfo: { name: string; timeRemaining: string }[] = [];

      // Calculate and collect income from each asset
      for (const asset of assets) {
        const template = assetTemplates.find(
          (t) => t.type === asset.type && t.name === asset.name
        );
        if (!template) continue;

        const income = this.calculatePendingIncome(asset, template);

        if (income.totalIncome > 0) {
          totalCash += income.breakdown.cash;
          totalBank += income.breakdown.bank;

          // Aggregate crypto dollar amounts (to be converted later)
          Object.entries(income.breakdown.crypto).forEach(
            ([coin, dollarAmount]) => {
              totalCryptoDollars[coin] =
                (totalCryptoDollars[coin] || 0) + dollarAmount;
            }
          );

          totalIncome += income.totalIncome;
          assetsWithIncome++;

          // Update asset's last income time
          await db.asset.update({
            where: { id: asset.id },
            data: { lastIncomeTime: new Date() },
          });
        } else {
          // Calculate when this asset will next have income available
          const hoursElapsed = Math.max(
            0,
            (Date.now() - new Date(asset.lastIncomeTime).getTime()) / (1000 * 60 * 60)
          );
          
          const minutesUntilNextIncome = Math.max(0, (0.25 - hoursElapsed) * 60); // 15 minutes minimum
          
          if (minutesUntilNextIncome > 0) {
            const timeRemaining = minutesUntilNextIncome < 1 
              ? "< 1 minute" 
              : `${Math.ceil(minutesUntilNextIncome)} minutes`;
            
            assetsWithoutIncome.push(asset.name);
            nextIncomeInfo.push({
              name: asset.name,
              timeRemaining
            });
          }
        }
      }

      // Provide feedback even if no income was collected
      if (totalIncome === 0) {
        let message = "No income available to collect right now.";
        
        if (nextIncomeInfo.length > 0) {
          message += "\n\n⏰ **Next Income Available:**\n";
          nextIncomeInfo.forEach(info => {
            message += `• ${info.name}: ${info.timeRemaining}\n`;
          });
          message += "\n💡 Assets generate income every 15 minutes - check back soon!";
        } else {
          message += " Assets generate income over time.";
        }

        return {
          success: false,
          message,
          error: "No pending income",
        };
      }

      // Distribute income to player's accounts
      await db.$transaction(
        async (tx) => {
          if (totalCash > 0) {
            await tx.character.updateMany({
              where: { userId: user.id },
              data: { cashOnHand: { increment: totalCash } },
            });
          }

          if (totalBank > 0) {
            await tx.character.updateMany({
              where: { userId: user.id },
              data: { bankBalance: { increment: totalBank } },
            });
          }

          // Convert crypto dollar amounts to actual crypto coins at current exchange rate
          if (Object.keys(totalCryptoDollars).length > 0) {
            const character = await tx.character.findFirst({
              where: { userId: user.id },
            });

            if (character) {
              // Parse the crypto wallet JSON properly
              let currentWallet: { [key: string]: number } = {};

              try {
                if (character.cryptoWallet) {
                  if (typeof character.cryptoWallet === "string") {
                    currentWallet = JSON.parse(character.cryptoWallet);
                  } else {
                    currentWallet = character.cryptoWallet as {
                      [key: string]: number;
                    };
                  }
                }
              } catch (error) {
                console.warn(
                  "Error parsing crypto wallet, using empty wallet:",
                  error
                );
                currentWallet = {};
              }

              // Convert dollar amounts to crypto coins at current exchange rate
              const moneyService = MoneyService.getInstance();
              for (const [coinType, dollarAmount] of Object.entries(
                totalCryptoDollars
              )) {
                if (dollarAmount > 0) {
                  try {
                    // Get current price for this coin type
                    const currentPrice = await moneyService.getCoinPrice(
                      coinType
                    );
                    // Convert dollars to actual crypto coins
                    const cryptoCoins = dollarAmount / currentPrice;
                    currentWallet[coinType] =
                      (currentWallet[coinType] || 0) + cryptoCoins;
                  } catch (error) {
                    console.error(
                      `Error getting price for ${coinType}:`,
                      error
                    );
                    // Fallback: use default exchange rate or skip this crypto income
                    console.warn(
                      `Skipping crypto income for ${coinType} due to price error`
                    );
                  }
                }
              }

              await tx.character.updateMany({
                where: { userId: user.id },
                data: { cryptoWallet: currentWallet },
              });
            }
          }
        },
        {
          timeout: 10000, // Increase timeout to 10 seconds
        }
      );

      // Calculate final crypto amounts for response (convert dollars to crypto coins for display)
      const finalCryptoAmounts: { [coinType: string]: number } = {};
      const moneyService = MoneyService.getInstance();

      for (const [coinType, dollarAmount] of Object.entries(
        totalCryptoDollars
      )) {
        if (dollarAmount > 0) {
          try {
            const currentPrice = await moneyService.getCoinPrice(coinType);
            finalCryptoAmounts[coinType] = dollarAmount / currentPrice;
          } catch (error) {
            console.error(
              `Error calculating final crypto amount for ${coinType}:`,
              error
            );
            finalCryptoAmounts[coinType] = 0; // Set to 0 if price lookup fails
          }
        }
      }

      // Log the income collection
      await db.actionLog.create({
        data: {
          userId: user.id,
          actionType: "income_collection",
          result: "success",
          details: {
            totalIncome,
            breakdown: {
              cash: totalCash,
              bank: totalBank,
              crypto: finalCryptoAmounts,
            },
            assetsCollected: assetsWithIncome,
          },
        },
      });

      // Create success message with detailed feedback
      let successMessage = `💰 Collected ${BotBranding.formatCurrency(
        totalIncome
      )} from ${assetsWithIncome} asset${assetsWithIncome !== 1 ? "s" : ""}!`;

      // Add information about assets that couldn't be collected
      if (assetsWithoutIncome.length > 0) {
        successMessage += `\n\n⏰ **Assets Still Generating Income:**\n`;
        nextIncomeInfo.forEach(info => {
          successMessage += `• ${info.name}: Ready in ${info.timeRemaining}\n`;
        });
        successMessage += `\n💡 Come back soon to collect from these assets!`;
      }

      return {
        success: true,
        message: successMessage,
        totalIncome,
        incomeBreakdown: {
          cash: totalCash,
          bank: totalBank,
          crypto: finalCryptoAmounts,
        },
        assetsCollected: assetsWithIncome,
      };
    } catch (error) {
      logger.error("Error collecting asset income:", error);
      return {
        success: false,
        message: "Failed to collect income",
        error: "Database error",
      };
    }
  }

  /**
   * Get all player's assets with pending income information
   */
  async getPlayerAssets(userId: string): Promise<AssetInfo[]> {
    try {
      const db = DatabaseManager.getClient();
      const user = await DatabaseManager.getUserForAuth(userId);

      if (!user) {
        return [];
      }

      const assets = await db.asset.findMany({
        where: { ownerId: user.id },
        orderBy: { name: "asc" },
      });

      return assets.map((asset) => {
        const template = assetTemplates.find(
          (t) => t.type === asset.type && t.name === asset.name
        );

        if (!template) {
          return {
            id: asset.id,
            name: asset.name,
            type: asset.type,
            level: asset.level,
            incomeRate: asset.incomeRate,
            securityLevel: asset.securityLevel,
            value: asset.value,
            lastIncomeTime: asset.lastIncomeTime,
            template: {} as AssetTemplate,
            pendingIncome: 0,
            pendingIncomeBreakdown: { cash: 0, bank: 0, crypto: {} },
          };
        }

        const income = this.calculatePendingIncome(asset, template);

        return {
          id: asset.id,
          name: asset.name,
          type: asset.type,
          level: asset.level,
          incomeRate: asset.incomeRate,
          securityLevel: asset.securityLevel,
          value: asset.value,
          lastIncomeTime: asset.lastIncomeTime,
          template,
          pendingIncome: income.totalIncome,
          pendingIncomeBreakdown: income.breakdown,
        };
      });
    } catch (error) {
      logger.error("Error getting player assets:", error);
      return [];
    }
  }

  // ===== ASSET UPGRADES =====

  /**
   * Calculate upgrade cost for an asset (income only)
   */
  calculateUpgradeCost(
    asset: any,
    template: AssetTemplate
  ): number | null {
    const currentLevel = asset.level;
    if (currentLevel >= template.maxLevel) {
      return null; // Already at max level
    }

    const upgrades = template.upgrades?.income;
    if (!upgrades || upgrades.length < currentLevel) {
      return null; // No upgrade available
    }

    return upgrades[currentLevel - 1].cost; // Array is 0-indexed, levels are 1-indexed
  }

  /**
   * Upgrade an asset (income only)
   */
  async upgradeAsset(
    userId: string,
    assetId: string,
    upgradeType: "income",
    paymentMethod: "cash" | "bank" | "mixed" = "mixed"
  ): Promise<AssetPurchaseResult> {
    try {
      const db = DatabaseManager.getClient();
      const user = await DatabaseManager.getUserForAuth(userId);

      if (!user) {
        return {
          success: false,
          message: "Character not found",
          error: "No character",
        };
      }

      // Get the asset
      const asset = await db.asset.findFirst({
        where: { id: assetId, ownerId: user.id },
      });

      if (!asset) {
        return {
          success: false,
          message: "Asset not found or not owned by you",
          error: "Asset not found",
        };
      }

      // Get asset template
      const template = assetTemplates.find(
        (t) => t.type === asset.type && t.name === asset.name
      );
      if (!template) {
        return {
          success: false,
          message: "Asset template not found",
          error: "Template not found",
        };
      }

      // Check if upgrade is available
      const cost = this.calculateUpgradeCost(asset, template);
      if (cost === null) {
        return {
          success: false,
          message: `${asset.name} is already at maximum level`,
          error: "Max level reached",
        };
      }

      // Process payment (similar to purchase logic)
      const balance = await this.moneyService.getUserBalance(userId);
      if (!balance) {
        return {
          success: false,
          message: "Could not fetch balance",
          error: "Balance error",
        };
      }

      // Validate payment method and available funds
      if (paymentMethod === "cash") {
        if (balance.cashOnHand < cost) {
          return {
            success: false,
            message: `Insufficient cash - need ${BotBranding.formatCurrency(cost)}, have ${BotBranding.formatCurrency(balance.cashOnHand)}`,
            error: "Insufficient cash",
          };
        }
      } else if (paymentMethod === "bank") {
        if (balance.bankBalance < cost) {
          return {
            success: false,
            message: `Insufficient bank funds - need ${BotBranding.formatCurrency(cost)}, have ${BotBranding.formatCurrency(balance.bankBalance)}`,
            error: "Insufficient bank funds",
          };
        }
      } else if (paymentMethod === "mixed") {
        // Check if total available funds (cash + bank) are sufficient
        const totalAvailable = balance.cashOnHand + balance.bankBalance;
        if (totalAvailable < cost) {
          return {
            success: false,
            message: `Insufficient funds - need ${BotBranding.formatCurrency(cost)}, have ${BotBranding.formatCurrency(totalAvailable)} (cash + bank)`,
            error: "Insufficient funds",
          };
        }
      }

      // Deduct payment using proper logic for each method
      if (paymentMethod === "cash") {
        await db.character.updateMany({
          where: { userId: user.id },
          data: { cashOnHand: { decrement: cost } },
        });
      } else if (paymentMethod === "bank") {
        await db.character.updateMany({
          where: { userId: user.id },
          data: { bankBalance: { decrement: cost } },
        });
      } else if (paymentMethod === "mixed") {
        // Use bank first, then cash to cover remaining amount
        const bankAmount = Math.min(balance.bankBalance, cost);
        const cashAmount = cost - bankAmount;

        // Deduct from bank first
        if (bankAmount > 0) {
          await db.character.updateMany({
            where: { userId: user.id },
            data: { bankBalance: { decrement: bankAmount } },
          });
        }

        // Deduct remaining from cash
        if (cashAmount > 0) {
          await db.character.updateMany({
            where: { userId: user.id },
            data: { cashOnHand: { decrement: cashAmount } },
          });
        }
      }

      // Apply income upgrade
      const upgrades = template.upgrades!.income;
      const upgrade = upgrades[asset.level - 1] as { cost: number; multiplier: number };

      const newIncomeRate = Math.floor(asset.incomeRate * upgrade.multiplier);

      await db.asset.update({
        where: { id: assetId },
        data: { 
          level: { increment: 1 },
          incomeRate: newIncomeRate
        },
      });

      // Log the upgrade
      await db.actionLog.create({
        data: {
          userId: user.id,
          actionType: "asset_upgrade",
          actionId: assetId,
          result: "success",
          details: {
            assetName: asset.name,
            upgradeType: "income",
            cost,
            newLevel: asset.level + 1,
            newIncomeRate: newIncomeRate,
          },
        },
      });

      return {
        success: true,
        message: `🔧 Successfully upgraded ${asset.name} income to level ${asset.level + 1}! New income rate: ${BotBranding.formatCurrency(newIncomeRate)}/hour`,
        cost,
      };
    } catch (error) {
      logger.error("Error upgrading asset:", error);
      return {
        success: false,
        message: "Failed to upgrade asset",
        error: "Database error",
      };
    }
  }
}

export default AssetService;
