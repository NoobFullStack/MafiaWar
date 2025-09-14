import { PrismaClient } from "@prisma/client";
import { initializeGameData } from "./GameSeeder";
import { logger } from "./ResponseUtil";

class DatabaseManager {
  private static instance: DatabaseManager;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient({
      log: ["warn", "error"],
    });
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public getClient(): PrismaClient {
    return this.prisma;
  }

  /**
   * Initialize database connection and optionally seed game data
   */
  async connect(seedData: boolean = false): Promise<void> {
    try {
      await this.prisma.$connect();
      logger.info("✅ Database connected successfully");

      if (seedData) {
        logger.info("🌱 Initializing game data...");
        await initializeGameData(this.prisma);
      }
    } catch (error) {
      logger.error("❌ Failed to connect to database", error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      logger.info("📡 Database disconnected");
    } catch (error) {
      logger.error("❌ Error disconnecting from database", error);
    }
  }

  /**
   * Get or create user (auto-registration for server members)
   */
  async getOrCreateUser(discordId: string, username: string) {
    try {
      // Try to find existing user
      let user = await this.prisma.user.findUnique({
        where: { discordId },
        include: {
          character: true,
          assets: true,
          gangs: true,
        },
      });

      // If user doesn't exist, create them
      if (!user) {
        logger.info(`Creating new user for Discord ID: ${discordId}`);

        user = await this.prisma.user.create({
          data: {
            discordId,
            username,
            character: {
              create: {
                name: username,
                stats: {
                  strength: 10,
                  stealth: 10,
                  intelligence: 10,
                },
                cashOnHand: 1000, // Starting money in new system
                bankBalance: 0,
                cryptoWallet: "{}",
                money: 0, // Legacy field kept at 0
                reputation: 0,
                level: 1,
              },
            },
          },
          include: {
            character: true,
            assets: true,
            gangs: true,
          },
        });

        logger.info(`✅ Created new user: ${username} (${discordId})`);
      } else {
        // Update username if it changed
        if (user.username !== username) {
          user = await this.prisma.user.update({
            where: { discordId },
            data: { username },
            include: {
              character: true,
              assets: true,
              gangs: true,
            },
          });
        }
      }

      return user;
    } catch (error) {
      logger.error("Error in getOrCreateUser", error);
      throw error;
    }
  }

  /**
   * Update character stats
   */
  async updateCharacterStats(
    userId: string,
    stats: Partial<{ strength: number; stealth: number; intelligence: number }>
  ) {
    try {
      const character = await this.prisma.character.findUnique({
        where: { userId },
      });

      if (!character) {
        throw new Error("Character not found");
      }

      const currentStats = character.stats as any;
      const newStats = { ...currentStats, ...stats };

      return await this.prisma.character.update({
        where: { userId },
        data: { stats: newStats },
      });
    } catch (error) {
      logger.error("Error updating character stats", error);
      throw error;
    }
  }

  /**
   * Update character money
   */
  async updateCharacterMoney(
    userId: string,
    amount: number,
    operation: "add" | "subtract" | "set" = "add"
  ) {
    try {
      const character = await this.prisma.character.findUnique({
        where: { userId },
      });

      if (!character) {
        throw new Error("Character not found");
      }

      let newAmount: number;
      switch (operation) {
        case "add":
          newAmount = character.money + amount;
          break;
        case "subtract":
          newAmount = Math.max(0, character.money - amount);
          break;
        case "set":
          newAmount = Math.max(0, amount);
          break;
      }

      return await this.prisma.character.update({
        where: { userId },
        data: { money: newAmount },
      });
    } catch (error) {
      logger.error("Error updating character money", error);
      throw error;
    }
  }

  /**
   * Log user action
   */
  async logAction(
    userId: string,
    actionType: string,
    result: string,
    details: any,
    actionId?: string
  ) {
    try {
      return await this.prisma.actionLog.create({
        data: {
          userId,
          actionType,
          actionId,
          result,
          details,
        },
      });
    } catch (error) {
      logger.error("Error logging action", error);
      throw error;
    }
  }

  /**
   * Check if user exists
   */
  async userExists(discordId: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { discordId },
      });
      return !!user;
    } catch (error) {
      logger.error("Error checking user existence", error);
      return false;
    }
  }

  /**
   * Delete a user and all their related data (CASCADE DELETE)
   * This is a comprehensive deletion that handles all foreign key relationships
   */
  async deleteUser(userId: string): Promise<{ success: boolean; deletedData?: any; error?: string }> {
    try {
      logger.info(`Starting deletion process for user: ${userId}`);

      // Start a transaction to ensure all deletions succeed or fail together
      const result = await this.prisma.$transaction(async (tx) => {
        // Get user data before deletion for logging
        const user = await tx.user.findUnique({
          where: { id: userId },
          include: {
            character: true,
            assets: true,
            gangs: true,
            ledGangs: true,
            inventory: true,
            actionLogs: true,
            robberies: true,
            missions: true,
            leaderboards: true,
            moneyEvents: true,
            bankTransactions: true,
            cryptoTransactions: true,
          },
        });

        if (!user) {
          throw new Error("User not found");
        }

        const deletionStats = {
          username: user.username,
          discordId: user.discordId,
          character: user.character ? 1 : 0,
          assets: user.assets.length,
          gangMemberships: user.gangs.length,
          ledGangs: user.ledGangs.length,
          inventory: user.inventory.length,
          actionLogs: user.actionLogs.length,
          robberies: user.robberies.length,
          missions: user.missions.length,
          leaderboards: user.leaderboards.length,
          moneyEvents: user.moneyEvents.length,
          bankTransactions: user.bankTransactions.length,
          cryptoTransactions: user.cryptoTransactions.length,
        };

        // Step 1: Handle gang leadership transfers
        // If user leads any gangs, transfer leadership or delete gangs if no other members
        for (const gang of user.ledGangs) {
          const otherMembers = await tx.gangMember.findMany({
            where: {
              gangId: gang.id,
              userId: { not: userId },
            },
            orderBy: { joinedAt: 'asc' },
          });

          if (otherMembers.length > 0) {
            // Transfer leadership to the oldest remaining member
            await tx.gang.update({
              where: { id: gang.id },
              data: { leaderId: otherMembers[0].userId },
            });
            logger.info(`Transferred gang leadership of ${gang.name} to user ${otherMembers[0].userId}`);
          } else {
            // No other members, delete the gang (this will cascade to gang members)
            await tx.gang.delete({
              where: { id: gang.id },
            });
            logger.info(`Deleted empty gang: ${gang.name}`);
          }
        }

        // Step 2: Handle asset robberies - delete logs where user was the robber
        await tx.assetRobberyLog.deleteMany({
          where: { robberId: userId },
        });

        // Step 3: Handle asset upgrades for owned assets (cascade via asset deletion)
        // This will be handled automatically when we delete assets

        // Step 4: Delete all user-related data in the correct order
        // (Following foreign key dependencies)

        // Delete crypto transactions
        await tx.cryptoTransaction.deleteMany({
          where: { userId },
        });

        // Delete bank transactions
        await tx.bankTransaction.deleteMany({
          where: { userId },
        });

        // Delete money events
        await tx.moneyEvent.deleteMany({
          where: { userId },
        });

        // Delete leaderboard entries
        await tx.leaderboard.deleteMany({
          where: { userId },
        });

        // Delete user missions
        await tx.userMission.deleteMany({
          where: { userId },
        });

        // Delete action logs
        await tx.actionLog.deleteMany({
          where: { userId },
        });

        // Delete inventory items
        await tx.inventory.deleteMany({
          where: { userId },
        });

        // Delete gang memberships
        await tx.gangMember.deleteMany({
          where: { userId },
        });

        // Delete assets and their related data (upgrades will cascade)
        for (const asset of user.assets) {
          // Delete asset upgrade logs first
          await tx.assetUpgrade.deleteMany({
            where: { assetId: asset.id },
          });

          // Delete asset robbery logs
          await tx.assetRobberyLog.deleteMany({
            where: { assetId: asset.id },
          });

          // Delete the asset
          await tx.asset.delete({
            where: { id: asset.id },
          });
        }

        // Delete character (this has a 1-to-1 relationship)
        if (user.character) {
          await tx.character.delete({
            where: { userId },
          });
        }

        // Finally, delete the user
        await tx.user.delete({
          where: { id: userId },
        });

        return deletionStats;
      });

      logger.info(`✅ Successfully deleted user ${result.username} (${result.discordId}) and all related data`, result);
      
      return { 
        success: true, 
        deletedData: result 
      };

    } catch (error) {
      logger.error("Error deleting user", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error during deletion" 
      };
    }
  }

  /**
   * Get user deletion preview - shows what would be deleted
   */
  async getUserDeletionPreview(discordId: string): Promise<{ 
    found: boolean; 
    preview?: any; 
    error?: string 
  }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { discordId },
        include: {
          character: true,
          assets: {
            include: {
              upgrades: true,
              robberyLogs: true,
            },
          },
          gangs: {
            include: {
              gang: true,
            },
          },
          ledGangs: {
            include: {
              members: true,
            },
          },
          inventory: {
            include: {
              item: true,
            },
          },
          actionLogs: true,
          robberies: true,
          missions: true,
          leaderboards: true,
          moneyEvents: true,
          bankTransactions: true,
          cryptoTransactions: true,
        },
      });

      if (!user) {
        return { found: false };
      }

      const preview = {
        user: {
          username: user.username,
          discordId: user.discordId,
          joinedAt: user.createdAt,
        },
        character: user.character ? {
          name: user.character.name,
          level: user.character.level,
          cashOnHand: user.character.cashOnHand,
          bankBalance: user.character.bankBalance,
          reputation: user.character.reputation,
        } : null,
        assets: user.assets.map(asset => ({
          name: asset.name,
          type: asset.type,
          level: asset.level,
          value: asset.value,
          upgrades: asset.upgrades.length,
          robberyLogs: asset.robberyLogs.length,
        })),
        gangs: {
          memberships: user.gangs.map(membership => ({
            gangName: membership.gang.name,
            role: membership.role,
            joinedAt: membership.joinedAt,
          })),
          leadership: user.ledGangs.map(gang => ({
            gangName: gang.name,
            memberCount: gang.members.length,
            willTransferTo: gang.members.find(m => m.userId !== user.id)?.userId || null,
            willDelete: gang.members.length === 1, // Only the leader
          })),
        },
        inventory: user.inventory.map(inv => ({
          itemName: inv.item.name,
          quantity: inv.quantity,
          value: inv.item.value,
        })),
        statistics: {
          totalActionLogs: user.actionLogs.length,
          totalRobberies: user.robberies.length,
          totalMissions: user.missions.length,
          leaderboardEntries: user.leaderboards.length,
          moneyEvents: user.moneyEvents.length,
          bankTransactions: user.bankTransactions.length,
          cryptoTransactions: user.cryptoTransactions.length,
        },
      };

      return { found: true, preview };

    } catch (error) {
      logger.error("Error getting user deletion preview", error);
      return { 
        found: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  /**
   * Check if user exists and has a valid character (for authentication)
   * Returns null if user doesn't exist or doesn't have a character
   */
  async getUserForAuth(discordId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { discordId },
        include: {
          character: true,
          assets: true,
          gangs: true,
        },
      });

      // Return null if user doesn't exist or doesn't have a character
      if (!user || !user.character) {
        return null;
      }

      return user;
    } catch (error) {
      logger.error("Error checking user authentication", error);
      return null;
    }
  }
}

export default DatabaseManager.getInstance();
