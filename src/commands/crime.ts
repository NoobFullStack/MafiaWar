import { SlashCommandBuilder } from "discord.js";
import { CrimeService } from "../services/CrimeService";
import { Command, CommandContext, CommandResult } from "../types/command";
import { ResponseUtil, logger } from "../utils/ResponseUtil";

const crimeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("crime")
    .setDescription("Commit a crime for money and experience")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Type of crime to commit")
        .setRequired(true)
        .addChoices(
          // Add choices based on available crimes
          { name: "Pickpocketing", value: "pickpocketing" },
          { name: "Shoplifting", value: "shoplifting" },
          { name: "Bike Theft", value: "bike_theft" },
          { name: "Credit Card Fraud", value: "credit_card_fraud" },
          { name: "Car Theft", value: "car_theft" },
          { name: "Burglary", value: "burglary" },
          { name: "Store Robbery", value: "store_robbery" },
          { name: "Bank Robbery", value: "bank_robbery" },
          { name: "Hacking", value: "hacking" }
        )
    ),

  async execute(context: CommandContext): Promise<CommandResult> {
    const { interaction, userId } = context;

    try {
      const crimeType = interaction.options.getString("type", true);

      // Check if player is in jail
      const jailStatus = await CrimeService.isPlayerInJail(userId);
      if (jailStatus.inJail) {
        const embed = ResponseUtil.warning(
          "🚔 You're in Jail!",
          `You're currently serving time and cannot commit crimes.\nTime remaining: ${jailStatus.timeLeft} minutes`
        );
        await interaction.reply({ embeds: [embed], flags: 64 });
        return { success: false, error: "Player is in jail" };
      }

      // Get crime data
      const crime = CrimeService.getCrimeById(crimeType);
      if (!crime) {
        const embed = ResponseUtil.error(
          "Invalid Crime",
          "The crime type you selected is not available."
        );
        await interaction.reply({ embeds: [embed], flags: 64 });
        return { success: false, error: "Invalid crime type" };
      }

      // Execute the crime (optimized for speed)
      const result = await CrimeService.executeCrime(crimeType, userId);

      // Create response embed
      let embed;
      if (result.success) {
        embed = ResponseUtil.success("Crime Successful! 🎯", result.message);

        // Add extra info for successful crimes
        if (result.criticalSuccess) {
          embed.setColor(0xffd700); // Gold for critical success
          embed.setTitle("🏆 Critical Success!");
        }
      } else {
        embed = ResponseUtil.error("Crime Failed! 🚫", result.message);
      }

      // Add compact crime info in description instead of separate fields
      const crimeInfo = `**${crime.name}** • Difficulty: ${
        crime.difficulty
      }/10 • Cooldown: ${Math.floor(crime.cooldown / 60)}min`;
      embed.setDescription(`${result.message}\n\n*${crimeInfo}*`);

      // Successful crimes are private (to hide earnings), failed crimes are public (for social dynamics)
      if (result.success) {
        await interaction.reply({ embeds: [embed], flags: 64 });
      } else {
        await interaction.reply({ embeds: [embed] });
      }

      // Log the crime attempt (after successful reply)
      logger.info(
        `Crime ${crimeType} executed by ${userId}: Success=${result.success}, Money=${result.moneyEarned}, XP=${result.experienceGained}`
      );

      return { success: true };
    } catch (error) {
      logger.error(`Crime command error for user ${userId}:`, error);

      let errorMessage = "An error occurred while committing the crime.";

      if (error instanceof Error) {
        // Handle specific error types
        if (
          error.message.includes("Level") ||
          error.message.includes("requirements")
        ) {
          errorMessage = error.message;
        } else if (error.message.includes("not found")) {
          errorMessage = "Crime data not found. Please try again.";
        }
      }

      // Only reply if we haven't already replied to the interaction
      if (!interaction.replied && !interaction.deferred) {
        const embed = ResponseUtil.error("Crime Error", errorMessage);
        await interaction.reply({ embeds: [embed], flags: 64 });
      }
      return { success: false, error: errorMessage };
    }
  },

  cooldown: 30, // 30 second cooldown between crime attempts
  category: "game",
  description: "Commit various crimes to earn money and experience points",
};

export default crimeCommand;
