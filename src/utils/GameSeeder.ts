import { PrismaClient } from "@prisma/client";
import { gameItems } from "../data/items";
import { crimeData } from "../data/crimes";
import { assetTemplates } from "../data/assets";
import { logger } from "./ResponseUtil";

/**
 * Smart seeding utility that handles upserts and prevents duplicates
 * Supports both initial seeding and incremental updates
 */
export class GameSeeder {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Seed items with upsert to prevent duplicates
   */
  async seedItems() {
    logger.info("🎒 Seeding items...");
    
    let created = 0;
    let updated = 0;
    
    for (const item of gameItems) {
      // Check if item exists before upserting
      const existing = await this.prisma.item.findUnique({
        where: { id: item.id }
      });
      
      const result = await this.prisma.item.upsert({
        where: { id: item.id },
        update: {
          name: item.name,
          type: item.type,
          value: item.value,
          description: item.description,
          rarity: item.rarity,
        },
        create: {
          id: item.id,
          name: item.name,
          type: item.type,
          value: item.value,
          description: item.description,
          rarity: item.rarity,
        },
      });
      
      if (existing) {
        updated++;
        logger.debug(`📝 Updated item: ${item.name}`);
      } else {
        created++;
        logger.debug(`➕ Created item: ${item.name}`);
      }
    }
    
    logger.info(`✅ Items seeded: ${created} created, ${updated} updated`);
    return { created, updated };
  }

  /**
   * Seed crimes with upsert to prevent duplicates
   */
  async seedCrimes() {
    logger.info("🔫 Seeding crimes...");
    
    let created = 0;
    let updated = 0;
    
    for (const crime of crimeData) {
      const existing = await this.prisma.crime.findUnique({
        where: { id: crime.id }
      });
      
      const result = await this.prisma.crime.upsert({
        where: { id: crime.id },
        update: {
          name: crime.name,
          description: crime.description,
          difficulty: crime.difficulty,
          cooldown: crime.cooldown,
          rewardMin: crime.rewardMin,
          rewardMax: crime.rewardMax,
          risk: Math.round((1 - crime.baseSuccessRate) * 100),
          jailTime: Math.round((crime.jailTimeMin + crime.jailTimeMax) / 2),
        },
        create: {
          id: crime.id,
          name: crime.name,
          description: crime.description,
          difficulty: crime.difficulty,
          cooldown: crime.cooldown,
          rewardMin: crime.rewardMin,
          rewardMax: crime.rewardMax,
          risk: Math.round((1 - crime.baseSuccessRate) * 100),
          jailTime: Math.round((crime.jailTimeMin + crime.jailTimeMax) / 2),
        },
      });
      
      if (existing) {
        updated++;
        logger.debug(`📝 Updated crime: ${crime.name}`);
      } else {
        created++;
        logger.debug(`➕ Created crime: ${crime.name}`);
      }
    }
    
    logger.info(`✅ Crimes seeded: ${created} created, ${updated} updated`);
    return { created, updated };
  }

  /**
   * Seed only new items that don't exist yet
   */
  async seedNewItems(newItems: typeof gameItems = gameItems) {
    logger.info("🆕 Seeding new items only...");
    
    let created = 0;
    let skipped = 0;
    
    for (const item of newItems) {
      const existing = await this.prisma.item.findUnique({
        where: { id: item.id },
      });
      
      if (!existing) {
        await this.prisma.item.create({
          data: {
            id: item.id,
            name: item.name,
            type: item.type,
            value: item.value,
            description: item.description,
            rarity: item.rarity,
          },
        });
        created++;
        logger.debug(`➕ Added new item: ${item.name}`);
      } else {
        skipped++;
        logger.debug(`⏭️  Skipped existing item: ${item.name}`);
      }
    }
    
    logger.info(`✅ New items: ${created} created, ${skipped} skipped`);
    return { created, skipped };
  }

  /**
   * Update prices for existing items (for game balancing)
   */
  async updateItemPrices(priceUpdates: { id: string; newValue: number }[]) {
    logger.info("💰 Updating item prices...");
    
    let updated = 0;
    let notFound = 0;
    
    for (const update of priceUpdates) {
      try {
        await this.prisma.item.update({
          where: { id: update.id },
          data: { value: update.newValue },
        });
        updated++;
        logger.debug(`💲 Updated ${update.id} price to $${update.newValue}`);
      } catch (error) {
        notFound++;
        logger.warn(`❌ Item not found for price update: ${update.id}`);
      }
    }
    
    logger.info(`✅ Price updates: ${updated} updated, ${notFound} not found`);
    return { updated, notFound };
  }

  /**
   * Run all seeding operations
   */
  async seedAll() {
    try {
      logger.info("🌱 Starting comprehensive game data seeding...");
      
      const itemsResult = await this.seedItems();
      const crimesResult = await this.seedCrimes();
      
      const totalCreated = itemsResult.created + crimesResult.created;
      const totalUpdated = itemsResult.updated + crimesResult.updated;
      
      logger.info(`🎉 Seeding complete! ${totalCreated} created, ${totalUpdated} updated`);
      
      return {
        items: itemsResult,
        crimes: crimesResult,
        total: { created: totalCreated, updated: totalUpdated }
      };
    } catch (error) {
      logger.error("❌ Error during comprehensive seeding:", error);
      throw error;
    }
  }

  /**
   * Validate data integrity after seeding
   */
  async validateSeeding() {
    logger.info("🔍 Validating seeded data...");
    
    const itemCount = await this.prisma.item.count();
    const crimeCount = await this.prisma.crime.count();
    
    const issues: string[] = [];
    
    // Check if all items were seeded
    if (itemCount < gameItems.length) {
      issues.push(`Items: Expected ${gameItems.length}, found ${itemCount}`);
    }
    
    // Check if all crimes were seeded
    if (crimeCount < crimeData.length) {
      issues.push(`Crimes: Expected ${crimeData.length}, found ${crimeCount}`);
    }
    
    // Check for items with invalid prices
    const invalidPriceItems = await this.prisma.item.count({
      where: { value: { lte: 0 } }
    });
    
    if (invalidPriceItems > 0) {
      issues.push(`${invalidPriceItems} items have invalid prices (≤ 0)`);
    }
    
    if (issues.length > 0) {
      logger.warn("⚠️  Data validation issues found:", issues);
      return { valid: false, issues };
    } else {
      logger.info("✅ Data validation passed");
      return { valid: true, issues: [] };
    }
  }

  /**
   * Get seeding statistics
   */
  async getStats() {
    const stats = {
      items: await this.prisma.item.count(),
      crimes: await this.prisma.crime.count(),
      itemsByRarity: await this.prisma.item.groupBy({
        by: ['rarity'],
        _count: true,
      }),
      crimesByDifficulty: await this.prisma.crime.groupBy({
        by: ['difficulty'],
        _count: true,
      }),
    };
    
    logger.info("📊 Seeding statistics:", stats);
    return stats;
  }
}

// Utility function for easy access
export async function initializeGameData(prisma?: PrismaClient) {
  const seeder = new GameSeeder(prisma);
  const result = await seeder.seedAll();
  await seeder.validateSeeding();
  await seeder.getStats();
  return result;
}
