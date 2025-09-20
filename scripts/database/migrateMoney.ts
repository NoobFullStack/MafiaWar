import DatabaseManager from "../src/utils/DatabaseManager";
import { logger } from "../src/utils/ResponseUtil";

/**
 * Migration script to move existing money to the new multi-layered money system
 * This script moves all existing "money" values to "cashOnHand" for backward compatibility
 */
export async function migrateLegacyMoney(): Promise<void> {
  try {
    logger.info("Starting legacy money migration...");

    const db = DatabaseManager.getClient();

    // Find all characters with legacy money that hasn't been migrated
    const characters = await db.character.findMany({
      where: {
        AND: [{ money: { gt: 0 } }, { cashOnHand: 0 }],
      },
    });

    logger.info(`Found ${characters.length} characters to migrate`);

    let migratedCount = 0;
    for (const character of characters) {
      try {
        // Move legacy money to cash on hand
        await db.character.update({
          where: { id: character.id },
          data: {
            cashOnHand: character.money,
            money: 0, // Clear legacy field
            // Initialize crypto wallet as empty object
            cryptoWallet: {},
            // Set default bank access level
            bankAccessLevel: 1,
          },
        });

        migratedCount++;
        logger.info(
          `Migrated ${character.name}: $${character.money} -> cashOnHand`
        );
      } catch (error) {
        logger.error(`Failed to migrate character ${character.id}:`, error);
      }
    }

    logger.info(
      `Migration complete: ${migratedCount}/${characters.length} characters migrated`
    );
  } catch (error) {
    logger.error("Migration failed:", error);
    throw error;
  }
}

/**
 * Initialize cryptocurrency prices in the database
 */
export async function initializeCryptoPrices(): Promise<void> {
  try {
    logger.info("Initializing cryptocurrency prices...");

    const db = DatabaseManager.getClient();

    const cryptoCoins = [
      { coinType: "bitcoin", price: 45000, change24h: 2.5 },
      { coinType: "ethereum", price: 3000, change24h: -1.2 },
      { coinType: "dogecoin", price: 0.25, change24h: 15.8 },
      { coinType: "mafiacoin", price: 10, change24h: 0 },
      { coinType: "crimechain", price: 50, change24h: -5.3 },
    ];

    for (const coin of cryptoCoins) {
      await db.cryptoPrice.upsert({
        where: { coinType: coin.coinType },
        update: {
          price: coin.price,
          change24h: coin.change24h,
          change7d: Math.random() * 20 - 10, // Random 7d change
          marketCap: coin.price * 1000000,
          volume24h: coin.price * 10000,
          updatedAt: new Date(),
        },
        create: {
          coinType: coin.coinType,
          price: coin.price,
          change24h: coin.change24h,
          change7d: Math.random() * 20 - 10,
          marketCap: coin.price * 1000000,
          volume24h: coin.price * 10000,
        },
      });
    }

    logger.info("Cryptocurrency prices initialized");
  } catch (error) {
    logger.error("Failed to initialize crypto prices:", error);
    throw error;
  }
}

/**
 * Run both migration functions
 */
export async function runMoneySystemMigration(): Promise<void> {
  try {
    await DatabaseManager.connect();

    await migrateLegacyMoney();
    await initializeCryptoPrices();

    logger.info("Money system migration completed successfully!");
  } catch (error) {
    logger.error("Money system migration failed:", error);
    throw error;
  } finally {
    await DatabaseManager.disconnect();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMoneySystemMigration()
    .then(() => {
      console.log("Migration completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
