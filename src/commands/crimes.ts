import { SlashCommandBuilder } from "discord.js";
import { Command, CommandContext, CommandResult } from "../types/command";
import { ResponseUtil, logger } from "../utils/ResponseUtil";
import { CrimeService } from "../services/CrimeService";
import { LevelCalculator } from "../config/economy";
import DatabaseManager from "../utils/DatabaseManager";

// Helper function to get category icons
function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'petty': '🎒',
    'theft': '🚗',
    'robbery': '💰',
    'violence': '⚔️',
    'white_collar': '💼',
    'organized': '🏛️'
  };
  return icons[category] || '🎯';
}

const crimesCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("crimes")
    .setDescription("View available crimes and requirements"),

  async execute(context: CommandContext): Promise<CommandResult> {
    const { interaction, userId, userTag } = context;
    
    try {
      // Get player data
      const user = await DatabaseManager.getOrCreateUser(userId, userTag);
      if (!user.character) {
        const embed = ResponseUtil.error(
          "Character Not Found",
          "Please use `/profile` first to create your character."
        );
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return { success: false, error: "Character not found" };
      }

      const character = user.character;
      const currentLevel = LevelCalculator.getLevelFromXP(character.experience);
      
      // Get available crimes
      const availableCrimes = CrimeService.getAvailableCrimes(currentLevel);
      const allCrimes = CrimeService.getAvailableCrimes(50); // Get all crimes to show locked ones

      // Create embed
      const embed = ResponseUtil.info(
        "🎯 Available Crimes",
        `Your Level: **${currentLevel}** | Available: **${availableCrimes.length}**/${allCrimes.length} crimes`
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
        const categoryName = category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ');
        
        const crimeList = crimes.map(crime => {
          const isAvailable = availableCrimes.some(c => c.id === crime.id);
          const levelReq = crime.requirements?.level || 1;
          const icon = isAvailable ? "✅" : "🔒";
          
          return `${icon} **${crime.name}** (L${levelReq}) - $${crime.rewardMin}-${crime.rewardMax}`;
        }).join('\n');

        embed.addFields({
          name: `${getCategoryIcon(category)} ${categoryName}`,
          value: crimeList || "No crimes available",
          inline: false,
        });
      }

      // Add helpful footer
      embed.setFooter({
        text: "Use /crime <type> to commit a crime • Level up to unlock more crimes!"
      });

      await interaction.reply({ embeds: [embed] });
      return { success: true };

    } catch (error) {
      logger.error(`Crimes command error for user ${userId}:`, error);

      const embed = ResponseUtil.error(
        "Error",
        "Failed to load crime information. Please try again."
      );
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return { success: false, error: "Failed to load crimes" };
    }
  },

  cooldown: 10,
  category: "game",
  description: "View all available crimes and their requirements",
};

export default crimesCommand;
