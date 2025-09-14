import { SlashCommandBuilder } from "discord.js";
import { Command, CommandContext, CommandResult } from "../types/command";
import DatabaseManager from "../utils/DatabaseManager";
import { ResponseUtil, logger } from "../utils/ResponseUtil";

const profileCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View your criminal profile and stats"),

  async execute(context: CommandContext): Promise<CommandResult> {
    const { interaction, userId, userTag } = context;

    try {
      // Get or create user (auto-registration)
      const user = await DatabaseManager.getOrCreateUser(userId, userTag);

      if (!user.character) {
        const errorEmbed = ResponseUtil.error(
          "Character Not Found",
          "There was an issue with your character. Please contact an administrator."
        );
        await interaction.reply({ embeds: [errorEmbed], flags: 64 });
        return { success: false, error: "Character not found" };
      }

      // Create profile embed
      const profileEmbed = ResponseUtil.gameProfile(user.character, user);

      // Add additional info
      profileEmbed.addFields(
        {
          name: "🏢 Assets Owned",
          value: user.assets.length.toString(),
          inline: true,
        },
        {
          name: "👥 Gang Memberships",
          value: user.gangs.length.toString(),
          inline: true,
        },
        {
          name: "📅 Joined",
          value: user.createdAt.toDateString(),
          inline: true,
        }
      );

      await interaction.reply({ embeds: [profileEmbed] });

      // Log the action
      await DatabaseManager.logAction(user.id, "profile_view", "success", {
        commandUsed: "profile",
      });

      return { success: true };
    } catch (error) {
      logger.error("Error in profile command", error);

      const errorEmbed = ResponseUtil.error(
        "Profile Error",
        "Failed to load your profile. Please try again later."
      );

      await interaction.reply({ embeds: [errorEmbed], flags: 64 });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  cooldown: 10,
  category: "game",
  description: "View your criminal character profile and statistics",
};

export default profileCommand;
