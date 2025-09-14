import { PrismaClient } from "@prisma/client";
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
   * Initialize database connection
   */
  async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      logger.info("✅ Database connected successfully");
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
                money: 1000, // Starting money
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
}

export default DatabaseManager.getInstance();
