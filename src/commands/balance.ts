import { SlashCommandBuilder } from "discord.js";
import { Command, CommandContext, CommandResult } from "../types/command";
import DatabaseManager from "../utils/DatabaseManager";
import { ResponseUtil, logger } from "../utils/ResponseUtil";

const balanceCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Check your current money and financial status")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Check another user's balance (optional)")
        .setRequired(false)
    ),

  async execute(context: CommandContext): Promise<CommandResult> {
    const { interaction, userId, userTag } = context;

    try {
      const targetUser = interaction.options.getUser("user");
      const targetUserId = targetUser ? targetUser.id : userId;
      const targetUserTag = targetUser ? targetUser.username : userTag;

      // Get user data
      const user = await DatabaseManager.getOrCreateUser(
        targetUserId,
        targetUserTag
      );

      if (!user.character) {
        const errorEmbed = ResponseUtil.error(
          "Character Not Found",
          "Character data not found for this user."
        );
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        return { success: false, error: "Character not found" };
      }

      const isOwnBalance = targetUserId === userId;
      const title = isOwnBalance
        ? "Your Balance"
        : `${targetUserTag}'s Balance`;

      const balanceEmbed = ResponseUtil.info(
        title,
        `💰 **$${user.character.money.toLocaleString()}**`,
        [
          {
            name: "Financial Status",
            value:
              user.character.money >= 10000
                ? "💎 Wealthy"
                : user.character.money >= 5000
                ? "💰 Comfortable"
                : user.character.money >= 1000
                ? "💵 Stable"
                : "🪙 Struggling",
            inline: true,
          },
          {
            name: "Level",
            value: user.character.level.toString(),
            inline: true,
          },
          {
            name: "Reputation",
            value: user.character.reputation.toString(),
            inline: true,
          },
        ]
      );

      await interaction.reply({ embeds: [balanceEmbed] });

      // Log the action
      await DatabaseManager.logAction(user.id, "balance_check", "success", {
        commandUsed: "balance",
        targetUser: targetUserId,
        isOwnBalance,
      });

      return { success: true };
    } catch (error) {
      logger.error("Error in balance command", error);

      const errorEmbed = ResponseUtil.error(
        "Balance Error",
        "Failed to retrieve balance information. Please try again later."
      );

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  cooldown: 5,
  category: "game",
  description: "Check your current money and financial status",
};

export default balanceCommand;
