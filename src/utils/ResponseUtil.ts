import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

export enum LogLevel {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  DEBUG = "DEBUG",
}

class Logger {
  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const baseMessage = `[${timestamp}] [${level}] ${message}`;

    if (data) {
      return `${baseMessage}\n${JSON.stringify(data, null, 2)}`;
    }

    return baseMessage;
  }

  info(message: string, data?: any): void {
    console.log(this.formatMessage(LogLevel.INFO, message, data));
  }

  warn(message: string, data?: any): void {
    console.warn(this.formatMessage(LogLevel.WARN, message, data));
  }

  error(message: string, error?: Error | any): void {
    const errorData =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error;

    console.error(this.formatMessage(LogLevel.ERROR, message, errorData));
  }

  debug(message: string, data?: any): void {
    if (process.env.NODE_ENV === "development") {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, data));
    }
  }
}

export const logger = new Logger();

/**
 * Error handling utilities for Discord interactions
 */
export class ErrorHandler {
  /**
   * Handle command execution errors
   */
  static async handleCommandError(
    interaction: ChatInputCommandInteraction,
    error: Error,
    commandName: string
  ): Promise<void> {
    logger.error(`Command error in ${commandName}`, error);

    const errorEmbed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("❌ Command Error")
      .setDescription("An error occurred while executing this command.")
      .setTimestamp();

    // Add specific error info in development
    if (process.env.NODE_ENV === "development") {
      errorEmbed.addFields({
        name: "Error Details",
        value: `\`\`\`${error.message}\`\`\``,
        inline: false,
      });
    }

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errorEmbed], flags: 64 });
      } else {
        await interaction.reply({ embeds: [errorEmbed], flags: 64 });
      }
    } catch (followUpError) {
      logger.error("Failed to send error message to user", followUpError);
    }
  }

  /**
   * Handle cooldown errors
   */
  static async handleCooldownError(
    interaction: ChatInputCommandInteraction,
    timeLeft: number
  ): Promise<void> {
    const cooldownEmbed = new EmbedBuilder()
      .setColor(0xffaa00)
      .setTitle("⏰ Command Cooldown")
      .setDescription(
        `Please wait ${timeLeft.toFixed(
          1
        )} more seconds before using this command again.`
      )
      .setTimestamp();

    await interaction.reply({ embeds: [cooldownEmbed], flags: 64 });
  }

  /**
   * Handle validation errors
   */
  static async handleValidationError(
    interaction: ChatInputCommandInteraction,
    message: string
  ): Promise<void> {
    const validationEmbed = new EmbedBuilder()
      .setColor(0xffaa00)
      .setTitle("⚠️ Invalid Input")
      .setDescription(message)
      .setTimestamp();

    await interaction.reply({ embeds: [validationEmbed], flags: 64 });
  }
}

/**
 * Response utilities for consistent Discord embeds
 */
export class ResponseUtil {
  static success(
    title: string,
    description: string,
    fields?: { name: string; value: string; inline?: boolean }[]
  ): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle(title) // Remove emoji from here, let commands decide
      .setDescription(description)
      .setTimestamp();

    if (fields) {
      embed.addFields(fields);
    }

    return embed;
  }

  static info(
    title: string,
    description: string,
    fields?: { name: string; value: string; inline?: boolean }[]
  ): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(title) // Remove emoji prefix
      .setDescription(description)
      .setTimestamp();

    if (fields) {
      embed.addFields(fields);
    }

    return embed;
  }

  static warning(
    title: string,
    description: string,
    fields?: { name: string; value: string; inline?: boolean }[]
  ): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(0xffaa00)
      .setTitle(`⚠️ ${title}`)
      .setDescription(description)
      .setTimestamp();

    if (fields) {
      embed.addFields(fields);
    }

    return embed;
  }

  static error(
    title: string,
    description: string,
    fields?: { name: string; value: string; inline?: boolean }[]
  ): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle(title) // Remove emoji prefix
      .setDescription(description)
      .setTimestamp();

    if (fields) {
      embed.addFields(fields);
    }

    return embed;
  }

  static gameProfile(character: any, user: any): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(0x800080) // Mafia purple
      .setTitle(`👤 ${character.name}'s Profile`)
      .setDescription(`Criminal Level ${character.level}`)
      .addFields(
        {
          name: "💰 Money",
          value: `$${character.money.toLocaleString()}`,
          inline: true,
        },
        {
          name: "⭐ Reputation",
          value: character.reputation.toString(),
          inline: true,
        },
        {
          name: "💪 Strength",
          value: character.stats.strength.toString(),
          inline: true,
        },
        {
          name: "🥷 Stealth",
          value: character.stats.stealth.toString(),
          inline: true,
        },
        {
          name: "🧠 Intelligence",
          value: character.stats.intelligence.toString(),
          inline: true,
        },
        { name: "\u200b", value: "\u200b", inline: true } // Empty field for alignment
      )
      .setTimestamp();
  }
}
