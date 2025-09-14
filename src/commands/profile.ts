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
      // Check if user exists
      const user = await DatabaseManager.getClient().user.findUnique({
        where: { discordId: userId },
        include: {
          character: true,
          assets: true,
          gangs: true,
        },
      });

      // If user doesn't exist, redirect to create-account
      if (!user) {
        const noAccountEmbed = ResponseUtil.noAccount(userTag);
        await ResponseUtil.smartReply(interaction, { embeds: [noAccountEmbed], flags: 64 });
        return { success: true };
      }

      if (!user.character) {
        const errorEmbed = ResponseUtil.error(
          "Character Not Found",
          "There was an issue with your character. Please contact an administrator."
        );
        await ResponseUtil.smartReply(interaction, { embeds: [errorEmbed], flags: 64 });
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

      await ResponseUtil.smartReply(interaction, { embeds: [profileEmbed], flags: 64 });

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

      await ResponseUtil.smartReply(interaction, { embeds: [errorEmbed], flags: 64 });
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
