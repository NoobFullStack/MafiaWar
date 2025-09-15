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
    return `${botConfig.currency.symbol}${amount.toLocaleString()}`;
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
