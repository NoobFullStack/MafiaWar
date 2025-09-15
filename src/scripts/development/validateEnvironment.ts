/**
 * Environment Configuration Validator
 * Checks if all required environment variables are set for development/testing
 */

import { config } from "dotenv";
import { logger } from "../../utils/ResponseUtil";

// Load environment variables
config();

function validateEnvironment() {
  logger.info("🔍 Validating Environment Configuration...");

  const requiredVars = [
    'DEBUG_DISCORD_ID',
    'DISCORD_BOT_TOKEN',
    'DISCORD_CLIENT_ID',
    'DATABASE_URL',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY'
  ];

  const optionalVars = [
    'BOT_NAME',
    'BOT_THEME_COLOR',
    'BOT_CURRENCY_SYMBOL',
    'BOT_CURRENCY_NAME',
    'CRYPTO_NAME',
    'CRYPTO_SYMBOL'
  ];

  let missingRequired = [];
  let missingOptional = [];

  // Check required variables
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value) {
      missingRequired.push(varName);
    } else {
      // Validate Discord ID format
      if (varName === 'DEBUG_DISCORD_ID') {
        if (!/^\d{17,19}$/.test(value)) {
          logger.warn(`⚠️  ${varName} doesn't look like a valid Discord ID (should be 17-19 digits)`);
        } else {
          logger.info(`✅ ${varName}: Valid format`);
        }
      } else {
        logger.info(`✅ ${varName}: Set`);
      }
    }
  }

  // Check optional variables
  for (const varName of optionalVars) {
    const value = process.env[varName];
    if (!value) {
      missingOptional.push(varName);
    } else {
      logger.info(`✅ ${varName}: ${value}`);
    }
  }

  // Summary
  if (missingRequired.length === 0) {
    logger.info("🎉 All required environment variables are configured!");
    
    if (missingOptional.length > 0) {
      logger.info(`ℹ️  Optional variables missing (using defaults): ${missingOptional.join(', ')}`);
    }
    
    logger.info("🚀 Environment is ready for development and testing!");
    return true;
  } else {
    logger.error("❌ Missing required environment variables:");
    for (const varName of missingRequired) {
      logger.error(`   - ${varName}`);
    }
    logger.error("\n📝 Please check your .env file and compare with .env.example");
    logger.error("💡 Copy .env.example to .env and fill in your values");
    return false;
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  const isValid = validateEnvironment();
  process.exit(isValid ? 0 : 1);
}

export default validateEnvironment;