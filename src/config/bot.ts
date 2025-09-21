/**
 * Bot Configuration
 * Manages configurable settings for the bot, allowing easy customization
 * without hardcoding values throughout the codebase.
 */

export interface BotConfig {
  name: string;
  themeColor: number;
  description: string;
  currency: {
    symbol: string;
    name: string;
  };
  crypto: {
    name: string;
    symbol: string;
    description: string;
    basePrice: number;
    volatility: number;
  };
  features: {
    enableCrypto: boolean;
    enableGangs: boolean;
    enableAssets: boolean;
  };
}

/**
 * Load bot configuration from environment variables with fallback defaults
 */
function loadBotConfig(): BotConfig {
  return {
    name: process.env.BOT_NAME || "MafiaWar",
    themeColor: parseInt(process.env.BOT_THEME_COLOR || "0x800080", 16),
    description: `Build your criminal empire in ${
      process.env.BOT_NAME || "MafiaWar"
    }!`,
    currency: {
      symbol: process.env.BOT_CURRENCY_SYMBOL || "$",
      name: process.env.BOT_CURRENCY_NAME || "dollars",
    },
    crypto: {
      name: process.env.CRYPTO_NAME || "MafiaCoin",
      symbol: process.env.CRYPTO_SYMBOL || "MAFIA",
      description:
        process.env.CRYPTO_DESCRIPTION ||
        "The official cryptocurrency of the criminal underworld.",
      basePrice: parseFloat(process.env.CRYPTO_BASE_PRICE || "1337"),
      volatility: parseFloat(process.env.CRYPTO_VOLATILITY || "0.35"),
    },
    features: {
      enableCrypto: process.env.BOT_ENABLE_CRYPTO !== "false",
      enableGangs: process.env.BOT_ENABLE_GANGS !== "false",
      enableAssets: process.env.BOT_ENABLE_ASSETS !== "false",
    },
  };
}

// Export the configuration instance
export const botConfig = loadBotConfig();

/**
 * Helper functions for common bot branding
 */
export class BotBranding {
  /**
   * Get the bot's primary theme color
   */
  static getThemeColor(): number {
    return botConfig.themeColor;
  }

  /**
   * Get the bot's name
   */
  static getName(): string {
    return botConfig.name;
  }

  /**
   * Get a formatted welcome message
   */
  static getWelcomeMessage(userTag: string): string {
    return `**${userTag}**, welcome to ${botConfig.name}!`;
  }

  /**
   * Get the bot's description for embeds
   */
  static getDescription(): string {
    return botConfig.description;
  }

  /**
   * Format currency amounts consistently
   */
  static formatCurrency(amount: number): string {
    // Use European formatting: 1.234.567 (dot for thousands, no decimals)
    const formatted = amount.toLocaleString("de-DE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return `${botConfig.currency.symbol}${formatted}`;
  }

  /**
   * Get currency name (e.g., "dollars", "credits", "tokens")
   */
  static getCurrencyName(): string {
    return botConfig.currency.name;
  }

  /**
   * Check if a feature is enabled
   */
  static isFeatureEnabled(feature: keyof BotConfig["features"]): boolean {
    return botConfig.features[feature];
  }

  /**
   * Get the cryptocurrency name
   */
  static getCryptoName(): string {
    return botConfig.crypto.name;
  }

  /**
   * Get the cryptocurrency symbol
   */
  static getCryptoSymbol(): string {
    return botConfig.crypto.symbol;
  }

  /**
   * Get the cryptocurrency description
   */
  static getCryptoDescription(): string {
    return botConfig.crypto.description;
  }

  /**
   * Get the cryptocurrency base price
   */
  static getCryptoBasePrice(): number {
    return botConfig.crypto.basePrice;
  }

  /**
   * Get the cryptocurrency volatility
   */
  static getCryptoVolatility(): number {
    return botConfig.crypto.volatility;
  }

  /**
   * Get bot title for embeds (with emoji if desired)
   */
  static getTitle(title: string): string {
    return `🎭 ${title} - ${botConfig.name}`;
  }

  /**
   * Get account creation title
   */
  static getAccountCreationTitle(): string {
    return `🎭 Welcome to ${botConfig.name}!`;
  }

  /**
   * Get footer text for embeds
   */
  static getFooterText(action?: string): string {
    const baseText = `${botConfig.name} Criminal Empire`;
    return action ? `${action} | ${baseText}` : baseText;
  }
}

export default botConfig;
