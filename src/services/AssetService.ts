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

import { assetTemplates, AssetTemplate } from "../data/assets";
import DatabaseManager from "../utils/DatabaseManager";
import { logger } from "../utils/ResponseUtil";
import { MoneyService } from "./MoneyService";
import { LevelGateValidator, PlayerProgress } from "../utils/LevelGateValidator";
import { BotBranding } from "../config/bot";

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
  getAvailableAssets(playerLevel: number, playerReputation: number, playerMoney: number): AssetTemplate[] {
    return assetTemplates.filter((asset) => {
      const levelReq = asset.requirements?.level || 1;
      const repReq = asset.requirements?.reputation || 0;
      const moneyReq = asset.requirements?.money || 0;

      return (
        playerLevel >= levelReq &&
        playerReputation >= repReq &&
        playerMoney >= (moneyReq + asset.basePrice) // Can afford requirement + purchase price
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
  ): Promise<{ canPurchase: boolean; reason?: string; requirements: string[] }> {
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
      stats: typeof user.character.stats === "string" 
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
      missing.push(`Level ${asset.requirements.level} (current: ${player.level})`);
      canPurchase = false;
    }

    // Check reputation requirement
    if (asset.requirements?.reputation && (player.reputation || 0) < asset.requirements.reputation) {
      requirements.push(`${asset.requirements.reputation} reputation`);
      missing.push(`${asset.requirements.reputation} reputation (current: ${player.reputation || 0})`);
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
      missing.push(`$${totalCost.toLocaleString()} total (have $${availableFunds.toLocaleString()})`);
      return {
        canPurchase: false,
        reason: `Insufficient funds - need $${totalCost.toLocaleString()}, have $${availableFunds.toLocaleString()}`,
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
      const result = await db.$transaction(async (tx) => {
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
              throw new Error(`Insufficient cash - need $${totalCost.toLocaleString()}, have $${currentUser.character.cashOnHand.toLocaleString()}`);
            }
            // Deduct from cash
            await tx.character.updateMany({
              where: { userId: user.id },
              data: { cashOnHand: { decrement: totalCost } },
            });
            break;

          case "bank":
            if (currentUser.character.bankBalance < totalCost) {
              throw new Error(`Insufficient bank funds - need $${totalCost.toLocaleString()}, have $${currentUser.character.bankBalance.toLocaleString()}`);
            }
            // Deduct from bank
            await tx.character.updateMany({
              where: { userId: user.id },
              data: { bankBalance: { decrement: totalCost } },
            });
            break;

          case "mixed":
            // Try to use bank first, then cash
            const bankAmount = Math.min(currentUser.character.bankBalance, totalCost);
            const cashAmount = totalCost - bankAmount;
            
            if (cashAmount > currentUser.character.cashOnHand) {
              throw new Error(`Insufficient funds - need $${totalCost.toLocaleString()}, have $${(currentUser.character.cashOnHand + currentUser.character.bankBalance).toLocaleString()}`);
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
      }, {
        timeout: 10000, // 10 second timeout for purchase transaction
      });

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
      if (error.message && (
        error.message.includes("Insufficient") || 
        error.message.includes("need $") ||
        error.message.includes("have $")
      )) {
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
  calculatePendingIncome(asset: any, template: AssetTemplate): {
    totalIncome: number;
    breakdown: { cash: number; bank: number; crypto: { [coinType: string]: number } };
  } {
    const hoursElapsed = Math.max(0, 
      (Date.now() - new Date(asset.lastIncomeTime).getTime()) / (1000 * 60 * 60)
    );
    
    // Cap at 24 hours to prevent exploitation
    const cappedHours = Math.min(hoursElapsed, 24);
    const baseIncome = Math.floor(asset.incomeRate * cappedHours);

    // Apply characteristics modifiers
    let modifiedIncome = baseIncome;
    
    if (template.characteristics?.seasonality) {
      modifiedIncome *= template.characteristics.seasonality;
    }

    // Calculate distribution
    const distribution = template.incomeDistribution;
    const cashAmount = Math.floor(modifiedIncome * (distribution.cash / 100));
    const bankAmount = Math.floor(modifiedIncome * (distribution.bank / 100));
    const cryptoAmount = modifiedIncome - cashAmount - bankAmount;

    const breakdown = {
      cash: cashAmount,
      bank: bankAmount,
      crypto: {} as { [coinType: string]: number },
    };

    // Distribute crypto income
    if (cryptoAmount > 0 && distribution.crypto > 0) {
      const cryptoType = distribution.cryptoType || "bitcoin";
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
          message: "You don't own any assets yet! Use `/assets` to browse available businesses.",
          error: "No assets",
        };
      }

      let totalCash = 0;
      let totalBank = 0;
      let totalCrypto: { [coinType: string]: number } = {};
      let totalIncome = 0;
      let assetsWithIncome = 0;

      // Calculate and collect income from each asset
      for (const asset of assets) {
        const template = assetTemplates.find((t) => t.type === asset.type && t.name === asset.name);
        if (!template) continue;

        const income = this.calculatePendingIncome(asset, template);
        
        if (income.totalIncome > 0) {
          totalCash += income.breakdown.cash;
          totalBank += income.breakdown.bank;
          
          // Aggregate crypto amounts
          Object.entries(income.breakdown.crypto).forEach(([coin, amount]) => {
            totalCrypto[coin] = (totalCrypto[coin] || 0) + amount;
          });
          
          totalIncome += income.totalIncome;
          assetsWithIncome++;

          // Update asset's last income time
          await db.asset.update({
            where: { id: asset.id },
            data: { lastIncomeTime: new Date() },
          });
        }
      }

      if (totalIncome === 0) {
        return {
          success: false,
          message: "No income available to collect. Assets generate income over time.",
          error: "No pending income",
        };
      }

      // Distribute income to player's accounts
      await db.$transaction(async (tx) => {
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

        // Handle crypto income directly in transaction
        if (Object.keys(totalCrypto).length > 0) {
          const character = await tx.character.findFirst({
            where: { userId: user.id },
          });
          
          if (character) {
            // Parse the crypto wallet JSON properly
            let currentWallet: { [key: string]: number } = {};
            
            try {
              if (character.cryptoWallet) {
                if (typeof character.cryptoWallet === 'string') {
                  currentWallet = JSON.parse(character.cryptoWallet);
                } else {
                  currentWallet = character.cryptoWallet as { [key: string]: number };
                }
              }
            } catch (error) {
              console.warn("Error parsing crypto wallet, using empty wallet:", error);
              currentWallet = {};
            }
            
            // Add crypto amounts to existing wallet
            for (const [coinType, amount] of Object.entries(totalCrypto)) {
              if (amount > 0) {
                currentWallet[coinType] = (currentWallet[coinType] || 0) + amount;
              }
            }
            
            await tx.character.updateMany({
              where: { userId: user.id },
              data: { cryptoWallet: currentWallet },
            });
          }
        }
      }, {
        timeout: 10000, // Increase timeout to 10 seconds
      });

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
              crypto: totalCrypto,
            },
            assetsCollected: assetsWithIncome,
          },
        },
      });

      return {
        success: true,
        message: `💰 Collected ${BotBranding.formatCurrency(totalIncome)} from ${assetsWithIncome} asset${assetsWithIncome !== 1 ? 's' : ''}!`,
        totalIncome,
        incomeBreakdown: {
          cash: totalCash,
          bank: totalBank,
          crypto: totalCrypto,
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
        const template = assetTemplates.find((t) => t.type === asset.type && t.name === asset.name);
        
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
   * Calculate upgrade cost for an asset
   */
  calculateUpgradeCost(asset: any, template: AssetTemplate, upgradeType: "income" | "security"): number | null {
    const currentLevel = asset.level;
    if (currentLevel >= template.maxLevel) {
      return null; // Already at max level
    }

    const upgrades = template.upgrades?.[upgradeType];
    if (!upgrades || upgrades.length < currentLevel) {
      return null; // No upgrade available
    }

    return upgrades[currentLevel - 1].cost; // Array is 0-indexed, levels are 1-indexed
  }

  /**
   * Upgrade an asset (income or security)
   */
  async upgradeAsset(
    userId: string,
    assetId: string,
    upgradeType: "income" | "security",
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
      const template = assetTemplates.find((t) => t.type === asset.type && t.name === asset.name);
      if (!template) {
        return {
          success: false,
          message: "Asset template not found",
          error: "Template not found",
        };
      }

      // Check if upgrade is available
      const cost = this.calculateUpgradeCost(asset, template, upgradeType);
      if (cost === null) {
        return {
          success: false,
          message: `${asset.name} is already at maximum ${upgradeType} level`,
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

      if (paymentMethod === "cash" && balance.cashOnHand < cost) {
        return {
          success: false,
          message: `Insufficient cash - need $${cost.toLocaleString()}, have $${balance.cashOnHand.toLocaleString()}`,
          error: "Insufficient cash",
        };
      }

      if (paymentMethod === "bank" && balance.bankBalance < cost) {
        return {
          success: false,
          message: `Insufficient bank funds - need $${cost.toLocaleString()}, have $${balance.bankBalance.toLocaleString()}`,
          error: "Insufficient bank funds",
        };
      }

      // Deduct payment
      if (paymentMethod === "cash") {
        await db.character.updateMany({
          where: { userId: user.id },
          data: { cashOnHand: { decrement: cost } },
        });
      } else {
        await db.character.updateMany({
          where: { userId: user.id },
          data: { bankBalance: { decrement: cost } },
        });
      }

      // Apply upgrade
      const upgrades = template.upgrades![upgradeType];
      const upgrade = upgrades[asset.level - 1];
      
      const updateData: any = { level: { increment: 1 } };
      
      if (upgradeType === "income") {
        const incomeUpgrade = upgrade as { cost: number; multiplier: number };
        updateData.incomeRate = Math.floor(asset.incomeRate * incomeUpgrade.multiplier);
      } else {
        const securityUpgrade = upgrade as { cost: number; value: number };
        updateData.securityLevel = { increment: securityUpgrade.value };
      }

      await db.asset.update({
        where: { id: assetId },
        data: updateData,
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
            upgradeType,
            cost,
            newLevel: asset.level + 1,
          },
        },
      });

      return {
        success: true,
        message: `🔧 Successfully upgraded ${asset.name} ${upgradeType} to level ${asset.level + 1}!`,
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
