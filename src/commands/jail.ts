import { SlashCommandBuilder } from "discord.js";
import { Command, CommandContext, CommandResult } from "../types/command";
import { ResponseUtil, logger } from "../utils/ResponseUtil";
import DatabaseManager from "../utils/DatabaseManager";
import JailService from "../services/JailService";
import { BotBranding } from "../config/bot";

// Helper functions for jail command
async function handleStatus(interaction: any, userId: string): Promise<CommandResult> {
  try {
    const jailStatus = await JailService.isPlayerInJail(userId);

    if (!jailStatus.inJail) {
      const embed = ResponseUtil.success(
        "🆓 You're Free!",
        "You're not currently in jail. Stay out of trouble!"
      );
      await ResponseUtil.smartReply(interaction, { embeds: [embed], flags: 64 });
      return { success: true };
    }

    // Player is in jail
    const embed = ResponseUtil.warning(
      "🚔 You're in Jail",
      `**Crime:** ${jailStatus.crime}\n` +
      `**Time Remaining:** ${jailStatus.timeLeftFormatted}\n` +
      `**Severity:** ${jailStatus.severity}/10\n\n` +
      `💰 **Bribe Cost:** ${BotBranding.formatCurrency(jailStatus.bribeAmount || 0)}\n` +
      `${jailStatus.canBribe ? "✅ You can afford the bribe!" : "❌ You can't afford the bribe."}\n\n` +
      `Use \`/jail bribe\` to pay your way out early!`
    );

    embed.setColor(jailStatus.canBribe ? 0xffa500 : 0xff0000); // Orange if can bribe, red if can't
    
    await ResponseUtil.smartReply(interaction, { embeds: [embed], flags: 64 });
    return { success: true };
  } catch (error) {
    logger.error(`Jail status error for user ${userId}:`, error);
    const embed = ResponseUtil.error("Status Error", "Failed to check jail status.");
    await ResponseUtil.smartReply(interaction, { embeds: [embed], flags: 64 });
    return { success: false, error: "Status check failed" };
  }
}

async function handleBribe(interaction: any, userId: string, userTag: string): Promise<CommandResult> {
  try {
    const bribeResult = await JailService.processBribe(userId);

    if (bribeResult.success) {
      const username = userTag.split("#")[0];
      const embed = ResponseUtil.success("🤝 Bribe Successful!", bribeResult.message);
      embed.setColor(0x00ff00); // Green for success
      
      // Make successful bribe public - everyone should see we paid to get out of jail
      await ResponseUtil.smartReply(interaction, { embeds: [embed] });
      
      // Also send a public announcement to the channel
      try {
        const publicMessage = `💰 **JAIL BRIBE** 💰\n${username} paid their way out of jail! Money talks in this city... 🚔💸`;
        const publicEmbed = ResponseUtil.info("🚔 Corruption Alert", publicMessage);
        
        const channel = interaction.channel;
        if (channel && "send" in channel) {
          await channel.send({ embeds: [publicEmbed] });
        }
      } catch (announcementError) {
        // Log but don't fail the command if public announcement fails
        logger.warn(
          `Failed to send public bribe announcement for user ${userId}:`,
          announcementError
        );
      }
    } else {
      // Keep failed bribes private to avoid spam
      const embed = ResponseUtil.error("❌ Bribe Failed", bribeResult.message);
      await ResponseUtil.smartReply(interaction, { embeds: [embed], flags: 64 });
    }

    return { success: bribeResult.success };
  } catch (error) {
    logger.error(`Jail bribe error for user ${userId}:`, error);
    const embed = ResponseUtil.error("Bribe Error", "Failed to process bribe payment.");
    await ResponseUtil.smartReply(interaction, { embeds: [embed], flags: 64 });
    return { success: false, error: "Bribe processing failed" };
  }
}

async function handleStats(interaction: any, userId: string): Promise<CommandResult> {
  try {
    const jailStats = await JailService.getJailStats(userId);
    const jailStatus = await JailService.isPlayerInJail(userId);

    const embed = ResponseUtil.info(
      "📊 Jail Statistics",
      `**Total Time Served:** ${JailService.formatJailTime(jailStats.totalJailTime)}\n` +
      `**Currently in Jail:** ${jailStats.currentlyInJail ? "Yes" : "No"}\n` +
      (jailStats.currentlyInJail && jailStats.timeLeft ? 
        `**Time Remaining:** ${JailService.formatJailTime(jailStats.timeLeft)}\n` : "") +
      `**Bribes Used:** ${jailStats.escapesUsed}\n\n` +
      `💡 *Tip: Keep some crypto hidden - police can't see it for bribes!*`
    );

    if (jailStatus.inJail) {
      embed.setColor(0xff6b6b); // Red-ish for jailed
      embed.addFields({
        name: "Current Sentence",
        value: `Crime: ${jailStatus.crime}\nSeverity: ${jailStatus.severity}/10\nBribe: ${BotBranding.formatCurrency(jailStatus.bribeAmount || 0)}`,
        inline: false
      });
    } else {
      embed.setColor(0x51cf66); // Green for free
    }

    await ResponseUtil.smartReply(interaction, { embeds: [embed], flags: 64 });
    return { success: true };
  } catch (error) {
    logger.error(`Jail stats error for user ${userId}:`, error);
    const embed = ResponseUtil.error("Stats Error", "Failed to retrieve jail statistics.");
    await ResponseUtil.smartReply(interaction, { embeds: [embed], flags: 64 });
    return { success: false, error: "Stats retrieval failed" };
  }
}

const jailCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("jail")
    .setDescription("Check your jail status or bribe your way out")
    .addSubcommand(subcommand =>
      subcommand
        .setName("status")
        .setDescription("Check your current jail status")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("bribe")
        .setDescription("Pay a bribe to get out of jail early")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("stats")
        .setDescription("View your jail statistics")
    ),

  async execute(context: CommandContext): Promise<CommandResult> {
    const { interaction, userId, userTag } = context;

    try {
      // Check if user has an account
      const user = await DatabaseManager.getUserForAuth(userId);
      if (!user) {
        const noAccountEmbed = ResponseUtil.noAccount(userTag);
        await ResponseUtil.smartReply(interaction, { embeds: [noAccountEmbed], flags: 64 });
        return { success: false, error: "User not registered" };
      }

      const subcommand = interaction.options.getSubcommand();

      switch (subcommand) {
        case "status":
          return await handleStatus(interaction, userId);
          
        case "bribe":
          return await handleBribe(interaction, userId, userTag);
          
        case "stats":
          return await handleStats(interaction, userId);
          
        default:
          const embed = ResponseUtil.error("Invalid Command", "Unknown subcommand.");
          await ResponseUtil.smartReply(interaction, { embeds: [embed], flags: 64 });
          return { success: false, error: "Invalid subcommand" };
      }
    } catch (error) {
      logger.error(`Jail command error for user ${userId}:`, error);
      
      if (!interaction.replied && !interaction.deferred) {
        const embed = ResponseUtil.error("Jail System Error", "An error occurred while processing your jail command.");
        await ResponseUtil.smartReply(interaction, { embeds: [embed], flags: 64 });
      }
      return { success: false, error: "Command execution failed" };
    }
  },

  cooldown: 5, // 5 second cooldown
  category: "game",
  description: "Manage your jail status and bribe your way out of trouble",
};

export default jailCommand;