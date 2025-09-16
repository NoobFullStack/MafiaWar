import { SlashCommandBuilder } from "discord.js";
import { BotBranding } from "../config/bot";
import { LevelCalculator } from "../config/economy";
import { MoneyService } from "../services/MoneyService";
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
      // Get user with character data
      const user = await DatabaseManager.getClient().user.findUnique({
        where: { discordId: userId },
        include: {
          character: true,
          assets: {
            include: {
              // Include any asset upgrades if needed
            },
          },
        },
      });

      // If user doesn't exist, redirect to user-create
      if (!user) {
        const noAccountEmbed = ResponseUtil.noAccount(userTag);
        await ResponseUtil.smartReply(interaction, {
          embeds: [noAccountEmbed],
          flags: 64,
        });
        return { success: true };
      }

      if (!user.character) {
        const errorEmbed = ResponseUtil.error(
          "Character Not Found",
          "There was an issue with your character. Please contact an administrator."
        );
        await ResponseUtil.smartReply(interaction, {
          embeds: [errorEmbed],
          flags: 64,
        });
        return { success: false, error: "Character not found" };
      }

      // Get comprehensive balance information
      const moneyService = MoneyService.getInstance();
      const balance = await moneyService.getUserBalance(userId, true);

      if (!balance) {
        const errorEmbed = ResponseUtil.error(
          "Balance Error",
          "Could not load your financial information. Please try again."
        );
        await ResponseUtil.smartReply(interaction, {
          embeds: [errorEmbed],
          flags: 64,
        });
        return { success: false, error: "Balance not found" };
      }

      // Calculate XP progress
      const currentLevelXP = LevelCalculator.getTotalXPForLevel(
        user.character.level
      );
      const nextLevelXP = LevelCalculator.getTotalXPForLevel(
        user.character.level + 1
      );
      const xpProgress = user.character.experience - currentLevelXP;
      const xpNeeded = nextLevelXP - currentLevelXP;
      const progressPercent = Math.floor((xpProgress / xpNeeded) * 100);

      // Get user's bank tier information
      const bankTier = moneyService.getUserBankTier(
        user.character.bankAccessLevel || 1
      );

      // Calculate total asset value and income
      const totalAssetValue = user.assets.reduce(
        (sum: number, asset: any) => sum + asset.value,
        0
      );
      const totalAssetIncome = user.assets.reduce(
        (sum: number, asset: any) => sum + asset.incomeRate,
        0
      );

      // Create enhanced profile embed
      const profileEmbed = ResponseUtil.gameProfile(user.character, user);

      // Clear all existing fields to rebuild with proper 3-column layout
      profileEmbed.spliceFields(0, profileEmbed.data.fields?.length || 0);

      // Update title and description to include reputation
      profileEmbed
        .setTitle(`👤 ${user.character.name}'s Criminal Profile`)
        .setDescription(
          `**Level ${user.character.level}** Criminal • **${user.character.reputation}** Reputation\n\u200B`
        ); // Extra spacing

      // Row 1: Level Progress - make it more visual
      profileEmbed.addFields(
        {
          name: "📈 Experience Points",
          value: `${xpProgress.toLocaleString()} / ${xpNeeded.toLocaleString()}`,
          inline: true,
        },
        {
          name: "⚡ Progress to Next Level",
          value: `${progressPercent}% → **Level ${user.character.level + 1}**`,
          inline: true,
        },
        {
          name: "\u200B",
          value: "\u200B",
          inline: true,
        }
      );

      // TODO: Hiddenn Stats for now; can be re-added later
      // // Add separator
      // profileEmbed.addFields({
      //   name: "\u200B",
      //   value: "**━━━ CHARACTER STATS ━━━**",
      //   inline: false,
      // });

      // // Row 2: Character Stats with better labels
      // const stats =
      //   typeof user.character.stats === "string"
      //     ? JSON.parse(user.character.stats)
      //     : user.character.stats || {};

      // profileEmbed.addFields(
      //   {
      //     name: "💪 Strength",
      //     value: `**${stats.strength || 10}**`,
      //     inline: true,
      //   },
      //   {
      //     name: "🥷 Stealth Ability",
      //     value: `**${stats.stealth || 10}**`,
      //     inline: true,
      //   },
      //   {
      //     name: "🧠 Intelligence",
      //     value: `**${stats.intelligence || 10}**`,
      //     inline: true,
      //   }
      // );

      // Add separator
      profileEmbed.addFields({
        name: "\u200B",
        value: "**━━━ FINANCIAL PORTFOLIO ━━━**",
        inline: false,
      });

      // Row 3: Financial Portfolio with better formatting
      const cryptoValue = balance.totalValue
        ? balance.totalValue - balance.cashOnHand - balance.bankBalance
        : 0;

      profileEmbed.addFields(
        {
          name: "💵 Cash on Hand",
          value: `**${BotBranding.formatCurrency(
            balance.cashOnHand
          )}**\n*Immediate access*`,
          inline: true,
        },
        {
          name: "🏦 Bank Account",
          value: `**${BotBranding.formatCurrency(balance.bankBalance)}**\n*${
            bankTier.name
          }*`,
          inline: true,
        },
        {
          name: "₿ Cryptocurrency",
          value: `**${BotBranding.formatCurrency(
            cryptoValue
          )}**\n*Digital assets*`,
          inline: true,
        }
      );

      // Add separator
      profileEmbed.addFields({
        name: "\u200B",
        value: "**━━━ BUSINESS EMPIRE ━━━**",
        inline: false,
      });

      // Row 4: Asset Portfolio with better descriptions
      profileEmbed.addFields(
        {
          name: "🏢 Properties Owned",
          value: `**${user.assets.length}** businesses\n*Active investments*`,
          inline: true,
        },
        {
          name: "💎 Portfolio Value",
          value: `**${BotBranding.formatCurrency(
            totalAssetValue
          )}**\n*Asset worth*`,
          inline: true,
        },
        {
          name: "📈 Passive Income",
          value: `**${BotBranding.formatCurrency(
            totalAssetIncome
          )}**\n*Daily earnings*`,
          inline: true,
        }
      );

      // Add final separator
      profileEmbed.addFields({
        name: "\u200B",
        value: "**━━━ ACCOUNT SUMMARY ━━━**",
        inline: false,
      });

      // Row 5: Account summary
      profileEmbed.addFields(
        {
          name: "💰 Net Worth",
          value: `**${BotBranding.formatCurrency(
            balance.totalValue || 0
          )}**\n*Total wealth*`,
          inline: true,
        },
        {
          name: "📅 Criminal Since",
          value: `**${user.createdAt.toDateString()}**\n*Account age*`,
          inline: true,
        },
        {
          name: "\u200B",
          value: "\u200B",
          inline: true,
        }
      );

      await ResponseUtil.smartReply(interaction, {
        embeds: [profileEmbed],
        flags: 64,
      });

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

      await ResponseUtil.smartReply(interaction, {
        embeds: [errorEmbed],
        flags: 64,
      });
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
