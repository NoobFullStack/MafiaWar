import { SlashCommandBuilder } from "discord.js";
import { getCrimeAnnouncement } from "../content/crimeAnnouncements";
import { crimeData } from "../data/crimes";
import { CrimeService } from "../services/CrimeService";
import { Command, CommandContext, CommandResult } from "../types/command";
import DatabaseManager from "../utils/DatabaseManager";
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
        .setAutocomplete(true)
    ),

  async execute(context: CommandContext): Promise<CommandResult> {
    const { interaction, userId, userTag } = context;

    try {
      // Check if user has an account
      const user = await DatabaseManager.getUserForAuth(userId);
      if (!user) {
        const noAccountEmbed = ResponseUtil.noAccount(userTag);
        await ResponseUtil.smartReply(interaction, {
          embeds: [noAccountEmbed],
          flags: 64,
        });
        return { success: false, error: "User not registered" };
      }

      const crimeType = interaction.options.getString("type", true);

      // Check if player is in jail
      const jailStatus = await CrimeService.isPlayerInJail(userId);
      if (jailStatus.inJail) {
        const embed = ResponseUtil.warning(
          "🚔 You're in Jail!",
          `You're currently serving time and cannot commit crimes.\nTime remaining: ${jailStatus.timeLeft} minutes`
        );
        await ResponseUtil.smartReply(interaction, {
          embeds: [embed],
          flags: 64,
        });
        return { success: false, error: "Player is in jail" };
      }

      // Get crime data
      const crime = CrimeService.getCrimeById(crimeType);
      if (!crime) {
        const embed = ResponseUtil.error(
          "Invalid Crime",
          "The crime type you selected is not available."
        );
        await ResponseUtil.smartReply(interaction, {
          embeds: [embed],
          flags: 64,
        });
        return { success: false, error: "Invalid crime type" };
      }

      // Execute the crime (optimized for speed)
      const result = await CrimeService.executeCrime(crimeType, userId);

      // Create private response embed (detailed stats)
      let privateEmbed;
      if (result.success) {
        privateEmbed = ResponseUtil.success(
          "Crime Successful! 🎯",
          result.message
        );

        // Add extra info for successful crimes
        if (result.criticalSuccess) {
          privateEmbed.setColor(0xffd700); // Gold for critical success
          privateEmbed.setTitle("🏆 Critical Success!");
        }
      } else {
        privateEmbed = ResponseUtil.error("Crime Failed! 🚫", result.message);
      }

      // Add compact crime info in description instead of separate fields
      // const crimeInfo = `**${crime.name}** • Difficulty: ${
      //   crime.difficulty
      // }/10 • Cooldown: ${Math.floor(crime.cooldown / 60)}min`;
      // privateEmbed.setDescription(`${result.message}\n\n*${crimeInfo}*`);

      // Send private message first (with detailed stats)
      await ResponseUtil.smartReply(interaction, {
        embeds: [privateEmbed],
        flags: 64,
      });

      // Send public announcement only if crime was actually attempted
      // (not for requirement failures or other pre-execution errors)
      try {
        const username = userTag.split("#")[0];
        console.log(
          `DEBUG: Calling getCrimeAnnouncement with: crimeType=${crimeType}, success=${result.success}, username="${username}"`
        );

        const publicMessage = getCrimeAnnouncement(
          crimeType,
          result.success,
          username // Always pass username for witness reports
        );

        console.log(`DEBUG: Got public message: "${publicMessage}"`);

        // Create public embed
        const publicEmbed = ResponseUtil.info("🚨 Crime Alert", publicMessage);

        // Send public message to the channel
        const channel = interaction.channel;
        if (channel && "send" in channel) {
          await channel.send({ embeds: [publicEmbed] });
        }
      } catch (announcementError) {
        // Log but don't fail the command if public announcement fails
        logger.warn(
          `Failed to send public crime announcement for ${crimeType}:`,
          announcementError
        );
      }

      // Log the crime attempt (after successful reply)
      logger.info(
        `Crime ${crimeType} executed by ${userId}: Success=${result.success}, Money=${result.moneyEarned}, XP=${result.experienceGained}`
      );

      return { success: true };
    } catch (error) {
      logger.error(`Crime command error for user ${userId}:`, error);

      let errorMessage = "An error occurred while committing the crime.";
      let errorTitle = "Crime Error";

      if (error instanceof Error) {
        // Handle specific error types
        if (
          error.message.includes("🔒") ||
          error.message.includes("Level") ||
          error.message.includes("requirements") ||
          error.message.includes("Requires") ||
          error.message.includes("reputation") ||
          error.message.includes("Strength") ||
          error.message.includes("Stealth") ||
          error.message.includes("Intelligence")
        ) {
          errorMessage = error.message;
          errorTitle = "Requirements Not Met";
        } else if (error.message.includes("not found")) {
          errorMessage = "Crime data not found. Please try again.";
          errorTitle = "Crime Error";
        } else if (error.message.includes("character")) {
          errorMessage =
            "You need to create a character first. Use `/user-create` to get started.";
          errorTitle = "No Character Found";
        } else if (
          error.message.includes("jail") ||
          error.message.includes("Jail")
        ) {
          errorMessage = error.message;
          errorTitle = "Cannot Commit Crime";
        } else {
          // For any other error, use the full message but sanitize it
          errorMessage = error.message || "An unexpected error occurred.";
          errorTitle = "Crime Error";
        }
      }

      // Always attempt to reply - use a more robust approach
      try {
        const embed = ResponseUtil.error(errorTitle, errorMessage);

        if (interaction.replied) {
          // If already replied, send a follow-up
          await interaction.followUp({ embeds: [embed], ephemeral: true });
        } else if (interaction.deferred) {
          // If deferred, edit the reply
          await interaction.editReply({ embeds: [embed] });
        } else {
          // If neither replied nor deferred, send initial reply
          await ResponseUtil.smartReply(interaction, {
            embeds: [embed],
            flags: 64,
          });
        }
      } catch (replyError) {
        logger.error(
          `Failed to send error response for user ${userId}:`,
          replyError
        );
        // Last resort - try a basic follow-up with minimal content
        try {
          const safeMessage =
            errorMessage.length > 2000
              ? errorMessage.substring(0, 1997) + "..."
              : errorMessage;

          await interaction.followUp({
            content: `❌ ${errorTitle}: ${safeMessage}`,
            ephemeral: true,
          });
        } catch (finalError) {
          logger.error(
            `Complete failure to respond to user ${userId}:`,
            finalError
          );
          // Absolute last resort - log the issue
          logger.error(
            `User ${userId} attempted crime ${interaction.options?.getString(
              "type"
            )} but received no response due to interaction errors`
          );
        }
      }

      return { success: false, error: errorMessage };
    }
  },

  async autocomplete(
    interaction: import("discord.js").AutocompleteInteraction
  ) {
    try {
      const focusedValue = interaction.options.getFocused().toLowerCase();

      // Get all crimes and format them with level requirements
      const allCrimes = crimeData
        .filter(
          (crime) =>
            crime.name.toLowerCase().includes(focusedValue) ||
            crime.id.toLowerCase().includes(focusedValue)
        )
        .slice(0, 25) // Discord limits to 25 choices
        .map((crime) => {
          const level = crime.requirements?.level || 1;
          return {
            name: `Lv.${level} - ${crime.name}`,
            value: crime.id,
          };
        });

      // Always provide at least some options
      if (allCrimes.length === 0) {
        // Show fallback crimes with level indicators
        await interaction.respond([
          { name: "Lv.1 - Pickpocketing", value: "pickpocketing" },
          { name: "Lv.1 - Shoplifting", value: "shoplifting" },
          { name: "Lv.1 - Bike Theft", value: "bike_theft" },
        ]);
      } else {
        await interaction.respond(allCrimes);
      }
    } catch (error) {
      logger.error(
        `Autocomplete error for user ${interaction.user.id}:`,
        error
      );
      // Always provide fallback options with level indicators
      try {
        await interaction.respond([
          { name: "Lv.1 - Pickpocketing", value: "pickpocketing" },
          { name: "Lv.1 - Shoplifting", value: "shoplifting" },
          { name: "Lv.1 - Bike Theft", value: "bike_theft" },
        ]);
      } catch (respondError) {
        logger.error(
          `Failed to send fallback autocomplete response:`,
          respondError
        );
      }
    }
  },

  cooldown: 10, // 10 second cooldown between crime attempts
  category: "game",
  description: "Commit various crimes to earn money and experience points",
};

export default crimeCommand;
