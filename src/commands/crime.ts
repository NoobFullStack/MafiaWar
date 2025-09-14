import { SlashCommandBuilder } from "discord.js";
import { Command, CommandContext, CommandResult } from "../types/command";
import { ResponseUtil, logger } from "../utils/ResponseUtil";
import { CrimeService } from "../services/CrimeService";
import { crimeData } from "../data/crimes";

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
          { name: "Pickpocketing", value: "pickpocket" },
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

      // Execute the crime
      try {
        const result = await CrimeService.executeCrime(crimeType, userId);

        // Create response embed
        let embed;
        if (result.success) {
          embed = ResponseUtil.success(
            "Crime Successful! 🎯",
            result.message
          );
          
          // Add extra info for successful crimes
          if (result.criticalSuccess) {
            embed.setColor(0xffd700); // Gold for critical success
            embed.setTitle("🏆 Critical Success!");
          }
        } else {
          embed = ResponseUtil.error(
            "Crime Failed! 🚫",
            result.message
          );
        }

        // Add compact crime info in description instead of separate fields
        const crimeInfo = `**${crime.name}** • Difficulty: ${crime.difficulty}/10 • Cooldown: ${Math.floor(crime.cooldown / 60)}min`;
        embed.setDescription(`${result.message}\n\n*${crimeInfo}*`);

        await interaction.reply({ embeds: [embed] });

        // Log the crime attempt
        logger.info(`Crime ${crimeType} executed by ${userId}: Success=${result.success}, Money=${result.moneyEarned}, XP=${result.experienceGained}`);

        return { success: true };
      } catch (error: any) {
        // Handle level requirement errors gracefully
        if (error.message.includes("Requires Level")) {
          const embed = ResponseUtil.warning(
            "Level Required! 🔒",
            error.message
          );
          await interaction.reply({ embeds: [embed], flags: 64 }); // 64 = ephemeral flag
          return { success: false, error: error.message };
        }
        
        // Re-throw other errors to be handled by outer catch
        throw error;
      }

    } catch (error) {
      logger.error(`Crime command error for user ${userId}:`, error);

      let errorMessage = "An error occurred while committing the crime.";
      
      if (error instanceof Error) {
        // Handle specific error types
        if (error.message.includes("Level") || error.message.includes("requirements")) {
          errorMessage = error.message;
        } else if (error.message.includes("not found")) {
          errorMessage = "Crime data not found. Please try again.";
        }
      }

      const embed = ResponseUtil.error(
        "Crime Error",
        errorMessage
      );
      
      await interaction.reply({ embeds: [embed], flags: 64 });
      return { success: false, error: errorMessage };
    }
  },

  cooldown: 30, // 30 second cooldown between crime attempts
  category: "game",
  description: "Commit various crimes to earn money and experience points",
};

export default crimeCommand;
