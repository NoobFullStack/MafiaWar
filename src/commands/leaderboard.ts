import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { BotBranding } from "../config/bot";
import { Command, CommandContext, CommandResult } from "../types/command";
import DatabaseManager from "../utils/DatabaseManager";
import { ResponseUtil, logger } from "../utils/ResponseUtil";

const leaderboardCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View the top players ranked by level and wealth"),

  async execute(context: CommandContext): Promise<CommandResult> {
    const { interaction } = context;

    try {
      // Get all characters with user data, ordered by level (descending), then by total wealth
      const characters = await DatabaseManager.getClient().character.findMany({
        include: {
          user: true,
        },
        orderBy: [
          { level: "desc" },
          { bankBalance: "desc" },
          { cashOnHand: "desc" },
        ],
        take: 25, // Show top 25 players
      });

      if (characters.length === 0) {
        const noPlayersEmbed = ResponseUtil.error(
          "No Players Found",
          "There are no registered players in the game yet."
        );
        await ResponseUtil.smartReply(interaction, {
          embeds: [noPlayersEmbed],
          ephemeral: false, // Make it public
        });
        return { success: true };
      }

      // Create leaderboard embed
      const leaderboardEmbed = new EmbedBuilder()
        .setTitle("🏆 Mafia Leaderboard")
        .setDescription("Top criminals ranked by level and wealth")
        .setColor(BotBranding.getThemeColor())
        .setTimestamp();

      // Function to get wealth bracket
      const getWealthBracket = (totalWealth: number): string => {
        if (totalWealth < 10000) return "💸 <$10K";
        if (totalWealth < 50000) return "💵 $10K-$50K";
        if (totalWealth < 100000) return "💴 $50K-$100K";
        if (totalWealth < 250000) return "💶 $100K-$250K";
        if (totalWealth < 500000) return "💷 $250K-$500K";
        if (totalWealth < 1000000) return "💰 $500K-$1M";
        if (totalWealth < 5000000) return "🏦 $1M-$5M";
        if (totalWealth < 10000000) return "🏛️ $5M-$10M";
        return "👑 $10M+";
      };

      // Add leaderboard entries
      let leaderboardText = "";
      characters.forEach((character: any, index: number) => {
        const rank = index + 1;
        const totalWealth = character.cashOnHand + character.bankBalance;

        // Get wealth bracket instead of exact amount
        const wealthBracket = getWealthBracket(totalWealth);

        // Add rank emoji for top 3
        let rankEmoji = "";
        if (rank === 1) rankEmoji = "🥇";
        else if (rank === 2) rankEmoji = "🥈";
        else if (rank === 3) rankEmoji = "🥉";
        else rankEmoji = `${rank}.`;

        leaderboardText += `${rankEmoji} **${character.name}** (Level ${character.level})\n${wealthBracket}\n\n`;
      });

      leaderboardEmbed.addFields({
        name: "Rankings",
        value: leaderboardText || "No data available",
        inline: false,
      });

      // Add footer with additional info
      leaderboardEmbed.setFooter({
        text: `${BotBranding.getName()} • Showing top ${
          characters.length
        } players`,
      });

      await ResponseUtil.smartReply(interaction, {
        embeds: [leaderboardEmbed],
        ephemeral: false, // Make it public so everyone can see
      });

      logger.info(`Leaderboard command executed successfully`);
      return { success: true };
    } catch (error) {
      logger.error("Error in leaderboard command:", error);

      const errorEmbed = ResponseUtil.error(
        "Leaderboard Error",
        "An error occurred while fetching the leaderboard. Please try again later."
      );

      await ResponseUtil.smartReply(interaction, {
        embeds: [errorEmbed],
        ephemeral: true,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

export default leaderboardCommand;
