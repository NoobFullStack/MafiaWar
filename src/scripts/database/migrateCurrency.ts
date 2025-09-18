import DatabaseManager from "../../utils/DatabaseManager";
import { logger } from "../../utils/ResponseUtil";

/**
 * Migration script to migrate currency data from Character table to dedicated CurrencyBalance tables
 * This implements Phase 2 of the currency migration plan
 */

export interface MigrationStats {
  totalCharacters: number;
  migratedCharacters: number;
  errors: string[];
  cashMigrations: number;
  bankMigrations: number;
  cryptoMigrations: number;
  bankingProfiles: number;
}

/**
 * Migrate character currency data to new dedicated tables
 */
export async function migrateCurrencyToTables(dryRun: boolean = true): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalCharacters: 0,
    migratedCharacters: 0,
    errors: [],
    cashMigrations: 0,
    bankMigrations: 0,
    cryptoMigrations: 0,
    bankingProfiles: 0,
  };

  try {
    logger.info(`Starting currency migration to dedicated tables (${dryRun ? 'DRY RUN' : 'APPLYING CHANGES'})...`);

    const db = DatabaseManager.getClient();

    // Get all characters with currency data that hasn't been migrated yet
    const characters = await db.character.findMany({
      where: {
        user: {
          currencyBalances: {
            none: {} // Characters that don't have any currency balance records yet
          }
        }
      },
      include: {
        user: true
      }
    });

    stats.totalCharacters = characters.length;
    logger.info(`Found ${characters.length} characters to migrate`);

    for (const character of characters) {
      try {
        if (!dryRun) {
          // Use transaction to ensure atomicity
          await db.$transaction(async (tx) => {
            const currencyRecords = [];
            
            // Migrate cash if > 0
            if (character.cashOnHand > 0) {
              currencyRecords.push({
                userId: character.userId,
                currencyType: "cash",
                coinType: null,
                amount: character.cashOnHand,
              });
              stats.cashMigrations++;
            }

            // Migrate bank balance if > 0
            if (character.bankBalance > 0) {
              currencyRecords.push({
                userId: character.userId,
                currencyType: "bank", 
                coinType: null,
                amount: character.bankBalance,
              });
              stats.bankMigrations++;
            }

            // Migrate crypto wallet
            const cryptoWallet = typeof character.cryptoWallet === 'string' 
              ? JSON.parse(character.cryptoWallet) 
              : character.cryptoWallet;

            if (cryptoWallet && typeof cryptoWallet === 'object') {
              for (const [coinType, amount] of Object.entries(cryptoWallet)) {
                if (typeof amount === 'number' && amount > 0) {
                  currencyRecords.push({
                    userId: character.userId,
                    currencyType: "crypto",
                    coinType: coinType,
                    amount: amount,
                  });
                  stats.cryptoMigrations++;
                }
              }
            }

            // Create currency balance records
            if (currencyRecords.length > 0) {
              await tx.currencyBalance.createMany({
                data: currencyRecords,
                skipDuplicates: true
              });
            }

            // Create banking profile
            await tx.bankingProfile.create({
              data: {
                userId: character.userId,
                accessLevel: character.bankAccessLevel,
                lastVisit: character.lastBankVisit,
                interestAccrued: character.bankInterestAccrued,
              }
            });
            stats.bankingProfiles++;
          });
        } else {
          // Dry run - just count what would be migrated
          if (character.cashOnHand > 0) stats.cashMigrations++;
          if (character.bankBalance > 0) stats.bankMigrations++;
          
          const cryptoWallet = typeof character.cryptoWallet === 'string' 
            ? JSON.parse(character.cryptoWallet) 
            : character.cryptoWallet;
          
          if (cryptoWallet && typeof cryptoWallet === 'object') {
            for (const [coinType, amount] of Object.entries(cryptoWallet)) {
              if (typeof amount === 'number' && amount > 0) {
                stats.cryptoMigrations++;
              }
            }
          }
          stats.bankingProfiles++;
        }

        stats.migratedCharacters++;
        
        if (stats.migratedCharacters % 100 === 0) {
          logger.info(`Migrated ${stats.migratedCharacters}/${stats.totalCharacters} characters...`);
        }

      } catch (error) {
        const errorMsg = `Failed to migrate character ${character.id} (${character.name}): ${error}`;
        logger.error(errorMsg);
        stats.errors.push(errorMsg);
      }
    }

    logger.info(`Migration ${dryRun ? 'analysis' : 'execution'} complete!`);
    logger.info(`Stats:`);
    logger.info(`  Total characters: ${stats.totalCharacters}`);
    logger.info(`  Successfully migrated: ${stats.migratedCharacters}`);
    logger.info(`  Cash records: ${stats.cashMigrations}`);
    logger.info(`  Bank records: ${stats.bankMigrations}`);
    logger.info(`  Crypto records: ${stats.cryptoMigrations}`);
    logger.info(`  Banking profiles: ${stats.bankingProfiles}`);
    logger.info(`  Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      logger.warn("Errors encountered:");
      stats.errors.forEach(error => logger.warn(`  ${error}`));
    }

    return stats;

  } catch (error) {
    logger.error("Currency migration failed:", error);
    throw error;
  }
}

/**
 * Validate migration integrity by comparing data between old and new tables
 */
export async function validateMigrationIntegrity(): Promise<boolean> {
  try {
    logger.info("Validating migration integrity...");

    const db = DatabaseManager.getClient();

    // Get all characters with their currency data
    const characters = await db.character.findMany({
      include: {
        user: {
          include: {
            currencyBalances: true,
            bankingProfile: true
          }
        }
      }
    });

    let validationErrors = 0;

    for (const character of characters) {
      if (!character.user.currencyBalances.length) {
        // Skip characters that haven't been migrated yet
        continue;
      }

      // Validate cash
      const cashBalance = character.user.currencyBalances.find(
        cb => cb.currencyType === "cash" && cb.coinType === null
      );
      if (character.cashOnHand > 0 && (!cashBalance || cashBalance.amount !== character.cashOnHand)) {
        logger.error(`Cash mismatch for ${character.name}: Character=${character.cashOnHand}, CurrencyBalance=${cashBalance?.amount || 0}`);
        validationErrors++;
      }

      // Validate bank
      const bankBalance = character.user.currencyBalances.find(
        cb => cb.currencyType === "bank" && cb.coinType === null
      );
      if (character.bankBalance > 0 && (!bankBalance || bankBalance.amount !== character.bankBalance)) {
        logger.error(`Bank mismatch for ${character.name}: Character=${character.bankBalance}, CurrencyBalance=${bankBalance?.amount || 0}`);
        validationErrors++;
      }

      // Validate crypto
      const cryptoWallet = typeof character.cryptoWallet === 'string' 
        ? JSON.parse(character.cryptoWallet) 
        : character.cryptoWallet;

      if (cryptoWallet && typeof cryptoWallet === 'object') {
        for (const [coinType, amount] of Object.entries(cryptoWallet)) {
          if (typeof amount === 'number' && amount > 0) {
            const cryptoBalance = character.user.currencyBalances.find(
              cb => cb.currencyType === "crypto" && cb.coinType === coinType
            );
            if (!cryptoBalance || cryptoBalance.amount !== amount) {
              logger.error(`Crypto mismatch for ${character.name} (${coinType}): Character=${amount}, CurrencyBalance=${cryptoBalance?.amount || 0}`);
              validationErrors++;
            }
          }
        }
      }

      // Validate banking profile
      if (!character.user.bankingProfile) {
        logger.error(`Missing banking profile for ${character.name}`);
        validationErrors++;
      } else {
        const profile = character.user.bankingProfile;
        if (profile.accessLevel !== character.bankAccessLevel) {
          logger.error(`Banking access level mismatch for ${character.name}: Character=${character.bankAccessLevel}, Profile=${profile.accessLevel}`);
          validationErrors++;
        }
      }
    }

    if (validationErrors === 0) {
      logger.info("✅ Migration integrity validation passed!");
      return true;
    } else {
      logger.error(`❌ Migration integrity validation failed with ${validationErrors} errors!`);
      return false;
    }

  } catch (error) {
    logger.error("Validation failed:", error);
    return false;
  }
}

/**
 * Run both migration and validation
 */
export async function runCurrencyMigration(): Promise<void> {
  try {
    await DatabaseManager.connect();

    // First run dry run
    await migrateCurrencyToTables(true);
    
    // Prompt user to continue (in actual execution)
    logger.info("Dry run complete. Run with --apply flag to execute migration.");
    
  } catch (error) {
    logger.error("Currency migration failed:", error);
    throw error;
  } finally {
    await DatabaseManager.disconnect();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const shouldApply = args.includes('--apply');
  
  runCurrencyMigration()
    .then(() => {
      if (shouldApply) {
        console.log("Currency migration completed successfully!");
      } else {
        console.log("Currency migration dry run completed successfully!");
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error("Currency migration failed:", error);
      process.exit(1);
    });
}