import { SlashCommandBuilder } from "discord.js";
import { Command, CommandContext, CommandResult } from "../types/command";
import CacheManager from "../utils/CacheManager";
import { ResponseUtil } from "../utils/ResponseUtil";

const cacheStatsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("cache-stats")
    .setDescription("View cache performance statistics (admin only)"),

  async execute(context: CommandContext): Promise<CommandResult> {
    const { interaction, userId } = context;

    // Simple admin check - you might want to improve this
    if (userId !== process.env.DEBUG_DISCORD_ID) {
      const embed = ResponseUtil.error(
        "Access Denied",
        "This command is only available to administrators."
      );
      await ResponseUtil.smartReply(interaction, {
        embeds: [embed],
        flags: 64,
      });
      return { success: false, error: "Access denied" };
    }

    try {
      const stats = CacheManager.getStats();
      
      let description = `**Cache Size:** ${stats.size} entries\n\n`;
      
      if (stats.entries.length === 0) {
        description += "No cache entries found.";
      } else {
        description += "**Recent Entries:**\n";
        
        // Show first 10 entries
        const recentEntries = stats.entries
          .sort((a, b) => a.age - b.age)
          .slice(0, 10);
        
        for (const entry of recentEntries) {
          const status = entry.expired ? "🔴 Expired" : "🟢 Active";
          description += `\`${entry.key}\` - ${status} (${entry.age}s/${entry.ttl}s)\n`;
        }
        
        if (stats.entries.length > 10) {
          description += `\n... and ${stats.entries.length - 10} more entries`;
        }
      }

      const embed = ResponseUtil.info("📊 Cache Statistics", description);

      await ResponseUtil.smartReply(interaction, {
        embeds: [embed],
        flags: 64,
      });

      return { success: true };
    } catch (error) {
      const embed = ResponseUtil.error(
        "Cache Stats Error",
        "Failed to retrieve cache statistics."
      );

      await ResponseUtil.smartReply(interaction, {
        embeds: [embed],
        flags: 64,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  cooldown: 5,
  category: "admin",
  description: "View cache performance statistics for monitoring optimization effectiveness",
};

export default cacheStatsCommand;