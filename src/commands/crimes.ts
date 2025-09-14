import { SlashCommandBuilder } from "discord.js";
import { LevelCalculator } from "../config/economy";
import { CrimeService } from "../services/CrimeService";
import { Command, CommandContext, CommandResult } from "../types/command";
import DatabaseManager from "../utils/DatabaseManager";
import { ResponseUtil, logger } from "../utils/ResponseUtil";

// Helper function to get category icons
function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    petty: "🎒",
    theft: "🚗",
    robbery: "💰",
    violence: "⚔️",
    white_collar: "💼",
    organized: "🏛️",
  };
  return icons[category] || "🎯";
}

const crimesCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("crimes")
    .setDescription("View available crimes and requirements"),

  async execute(context: CommandContext): Promise<CommandResult> {
    const { interaction, userId, userTag } = context;

    try {
      // Check if user has an account
      const user = await DatabaseManager.getUserForAuth(userId);
      if (!user) {
        const noAccountEmbed = ResponseUtil.noAccount(userTag);
        await interaction.reply({ embeds: [noAccountEmbed], flags: 64 });
        return { success: false, error: "User not registered" };
      }

      const character = user.character!; // Safe because getUserForAuth checks for character existence
      const currentLevel = LevelCalculator.getLevelFromXP(character.experience);

      // Get available crimes
      const availableCrimes = CrimeService.getAvailableCrimes(currentLevel);
      const allCrimes = CrimeService.getAvailableCrimes(50); // Get all crimes to show locked ones

      // Create embed
      const embed = ResponseUtil.info(
        "🔫 Available Crimes",
        `**Level ${character.level}** | ${availableCrimes.length} crimes unlocked\n\nFormat: **Name** | **Level Required** | **Reward Range**`
      );
      
      // Group crimes by category
      const crimesByCategory = allCrimes.reduce((acc, crime) => {
        if (!acc[crime.category]) {
          acc[crime.category] = [];
        }
        acc[crime.category].push(crime);
        return acc;
      }, {} as Record<string, typeof allCrimes>);

      // Add fields for each category
      for (const [category, crimes] of Object.entries(crimesByCategory)) {
        const categoryName =
          category.charAt(0).toUpperCase() +
          category.slice(1).replace("_", " ");

        const crimeList = crimes
          .map((crime) => {
            const isAvailable = availableCrimes.some((c) => c.id === crime.id);
            const levelReq = crime.requirements?.level || 1;
            const icon = isAvailable ? "✅" : "🔒";

            // More compact format: Name | Level | Reward
            return `${icon} **${crime.name}** | Lv.${levelReq} | $${crime.rewardMin}-${crime.rewardMax}`;
          })
          .join("\n");

        embed.addFields({
          name: `${getCategoryIcon(category)} ${categoryName}`,
          value: crimeList || "No crimes available",
          inline: true, // Make categories display side by side when possible
        });
      }

      // Add helpful footer
      embed.setFooter({
        text: "💡 Tip: Use /crime <type> to commit crimes • Level up to unlock more!\n✅ = Available • 🔒 = Level locked",
      });

      await interaction.reply({ embeds: [embed], flags: 64 });
      return { success: true };
    } catch (error) {
      logger.error(`Crimes command error for user ${userId}:`, error);

      const embed = ResponseUtil.error(
        "Error",
        "Failed to load crime information. Please try again."
      );

      await interaction.reply({ embeds: [embed], flags: 64 });
      return { success: false, error: "Failed to load crimes" };
    }
  },

  cooldown: 10,
  category: "game",
  description: "View all available crimes and their requirements",
};

export default crimesCommand;
