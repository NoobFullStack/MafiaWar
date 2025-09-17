import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { BotBranding } from "../config/bot";
import {
  getBusinessPurchaseAnnouncement,
  shouldAnnouncePurchase,
} from "../content/buyBusinessAnnouncements";
import {
  getCollectionAnnouncement,
  shouldAnnounceCollection,
} from "../content/collectionAnnouncements";
import { assetTemplates } from "../data/assets";
import { AssetService } from "../services/AssetService";
import JailService from "../services/JailService";
import { Command, CommandContext, CommandResult } from "../types/command";
import DatabaseManager from "../utils/DatabaseManager";
import { ResponseUtil } from "../utils/ResponseUtil";

const businessCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("business")
    .setDescription("Manage your business assets")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("buy")
        .setDescription("Purchase a business asset")
        .addStringOption((option) =>
          option
            .setName("asset")
            .setDescription("The asset to purchase")
            .setRequired(true)
            .addChoices(
              ...assetTemplates.map((asset) => ({
                name: `${asset.name} - ${BotBranding.formatCurrency(
                  asset.basePrice
                )}`,
                value: asset.id,
              }))
            )
        )
        .addStringOption((option) =>
          option
            .setName("payment")
            .setDescription("Payment method")
            .addChoices(
              { name: "Cash", value: "cash" },
              { name: "Bank", value: "bank" },
              { name: "Mixed (Bank + Cash)", value: "mixed" }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("list")
        .setDescription("View your owned business assets")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("collect")
        .setDescription("Collect income from all your assets")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("upgrade")
        .setDescription("Upgrade one of your assets")
        .addIntegerOption((option) =>
          option
            .setName("asset_number")
            .setDescription(
              "The position number of the asset to upgrade (use /business list to see numbers)"
            )
            .setRequired(true)
            .setMinValue(1)
        )
    ),

  async execute(context: CommandContext): Promise<CommandResult> {
    const { interaction } = context;
    const userId = interaction.user.id;
    const userTag = interaction.user.tag;
    const subcommand = interaction.options.getSubcommand();

    try {
      // Check if user has an account
      const user = await DatabaseManager.getUserForAuth(userId);
      if (!user?.character) {
        const noAccountEmbed = ResponseUtil.noAccount(userTag);
        await interaction.editReply({ embeds: [noAccountEmbed] });
        return { success: false, error: "User not registered" };
      }

      // Check if player is in jail (blocks business activities)
      const jailCheck = await JailService.checkJailBlocking(userId, "business");
      if (jailCheck.blocked) {
        const embed = ResponseUtil.error(
          "🚔 Action Blocked",
          jailCheck.reason || "You're in jail!"
        );
        await ResponseUtil.smartReply(interaction, {
          embeds: [embed],
          flags: 64,
        });
        return { success: false, error: "Player is in jail" };
      }

      const assetService = AssetService.getInstance();

      switch (subcommand) {
        case "buy": {
          const assetId = interaction.options.getString("asset", true);
          const paymentMethod =
            (interaction.options.getString("payment") as
              | "cash"
              | "bank"
              | "mixed") || "mixed";

          // Get asset template
          const assetTemplate = assetService.getAssetTemplate(assetId);
          if (!assetTemplate) {
            const embed = ResponseUtil.error(
              "Asset Not Found",
              "The specified asset could not be found."
            );
            await interaction.editReply({ embeds: [embed] });
            return { success: false, error: "Asset not found" };
          }

          // Validate purchase
          const validation = await assetService.validateAssetPurchase(
            userId,
            assetId
          );
          if (!validation.canPurchase) {
            const embed = ResponseUtil.error(
              "Cannot Purchase Asset",
              `**${assetTemplate.name}** - ${validation.reason}`
            );

            if (validation.requirements.length > 0) {
              embed.addFields({
                name: "📋 Requirements",
                value: validation.requirements.join("\n"),
                inline: false,
              });
            }

            await interaction.editReply({ embeds: [embed] });
            return { success: false, error: "Requirements not met" };
          }

          // Attempt purchase
          const result = await assetService.purchaseAsset(
            userId,
            assetId,
            paymentMethod
          );

          let embed;
          if (result.success) {
            embed = ResponseUtil.success("🏢 Asset Purchased!", result.message);

            if (result.asset && result.cost) {
              embed.addFields(
                {
                  name: "📊 Asset Details",
                  value:
                    `**Name:** ${result.asset.name}\n` +
                    `**Type:** ${result.asset.type}\n` +
                    `**Income Rate:** ${BotBranding.formatCurrency(
                      result.asset.incomeRate
                    )}/hour\n` +
                    `**Security Level:** ${result.asset.securityLevel}`,
                  inline: true,
                },
                {
                  name: "💰 Purchase Info",
                  value:
                    `**Cost:** ${BotBranding.formatCurrency(result.cost)}\n` +
                    `**Payment Method:** ${paymentMethod}\n` +
                    `**Status:** ✅ Purchased`,
                  inline: true,
                }
              );

              // Show income distribution
              const dist = assetTemplate.incomeDistribution;
              let incomeInfo = "**Income Distribution:**\n";
              if (dist.cash > 0) incomeInfo += `💵 Cash: ${dist.cash}%\n`;
              if (dist.bank > 0) incomeInfo += `🏦 Bank: ${dist.bank}%\n`;
              if (dist.crypto > 0) incomeInfo += `₿ Crypto: ${dist.crypto}%\n`;

              embed.addFields({
                name: "📈 Income Details",
                value: incomeInfo,
                inline: false,
              });
            }

            embed.setFooter({
              text: "💡 Use /business list to view all assets • /business collect to gather income",
            });

            // First, send the private detailed response
            await interaction.editReply({ embeds: [embed] });

            // Then, send public announcement if purchase should be announced
            if (
              result.cost &&
              shouldAnnouncePurchase(result.cost, assetTemplate.category)
            ) {
              try {
                const announcement = getBusinessPurchaseAnnouncement(
                  interaction.user.username,
                  assetTemplate.name,
                  assetTemplate.category,
                  result.cost
                );

                // Send public message to the channel (not ephemeral)
                if (interaction.channel && "send" in interaction.channel) {
                  await interaction.channel.send({
                    content: announcement,
                  });
                }
              } catch (announcementError) {
                console.error(
                  "Error sending purchase announcement:",
                  announcementError
                );
                // Don't fail the entire command if announcement fails
              }
            }
          } else {
            embed = ResponseUtil.error("Purchase Failed", result.message);
            await interaction.editReply({ embeds: [embed] });
          }

          return { success: result.success };
        }

        case "list": {
          const assets = await assetService.getPlayerAssets(userId);

          if (assets.length === 0) {
            const embed = ResponseUtil.info(
              "🏢 No Assets Owned",
              "You don't own any business assets yet!\n\n" +
                "**Getting Started:**\n" +
                "• Use `/assets` to browse available businesses\n" +
                "• Use `/business buy <asset>` to purchase your first asset\n" +
                `• Start with a Convenience Store for ${BotBranding.formatCurrency(
                  15000
                )}`
            );
            await interaction.editReply({ embeds: [embed] });
            return { success: true };
          }

          const embed = new EmbedBuilder()
            .setTitle("🏢 Your Business Portfolio")
            .setColor(0x3498db)
            .setDescription(
              `You own ${assets.length} business asset${
                assets.length !== 1 ? "s" : ""
              }.`
            );

          let totalPendingIncome = 0;
          let totalHourlyIncome = 0;

          assets.forEach((asset, index) => {
            totalPendingIncome += asset.pendingIncome;
            totalHourlyIncome += asset.incomeRate;

            const hoursElapsed = Math.max(
              0,
              (Date.now() - asset.lastIncomeTime.getTime()) / (1000 * 60 * 60)
            );

            let assetInfo = `**Level:** ${asset.level}/${asset.template.maxLevel}\n`;
            assetInfo += `**Income Rate:** ${BotBranding.formatCurrency(
              asset.incomeRate
            )}/hour\n`;
            assetInfo += `**Pending Income:** ${BotBranding.formatCurrency(
              asset.pendingIncome
            )}\n`;
            assetInfo += `**Last Collection:** ${hoursElapsed.toFixed(
              1
            )} hours ago\n`;

            // Income breakdown
            if (asset.pendingIncomeBreakdown && asset.pendingIncome > 0) {
              let breakdown = "**Pending Breakdown:**\n";
              if (asset.pendingIncomeBreakdown.cash > 0) {
                breakdown += `💵 ${BotBranding.formatCurrency(
                  asset.pendingIncomeBreakdown.cash
                )}\n`;
              }
              if (asset.pendingIncomeBreakdown.bank > 0) {
                breakdown += `🏦 ${BotBranding.formatCurrency(
                  asset.pendingIncomeBreakdown.bank
                )}\n`;
              }
              Object.entries(asset.pendingIncomeBreakdown.crypto).forEach(
                ([coin, amount]) => {
                  if (amount > 0) {
                    breakdown += `₿ ${BotBranding.formatCurrency(
                      amount
                    )} (${coin})\n`;
                  }
                }
              );
              assetInfo += breakdown;
            }

            embed.addFields({
              name: `${index + 1}. ${asset.name}`,
              value: assetInfo,
              inline: true,
            });
          });

          // Summary
          embed.addFields({
            name: "📊 Portfolio Summary",
            value:
              `**Total Hourly Income:** ${BotBranding.formatCurrency(
                totalHourlyIncome
              )}/hour\n` +
              `**Total Pending Income:** ${BotBranding.formatCurrency(
                totalPendingIncome
              )}\n` +
              `**Assets Owned:** ${assets.length}`,
            inline: false,
          });

          embed.setFooter({
            text: "💡 Use /business collect to gather all pending income • /business upgrade <number> income to improve income rates",
          });

          await interaction.editReply({ embeds: [embed] });
          return { success: true };
        }

        case "collect": {
          try {
            const result = await assetService.collectAllIncome(userId);

            let embed;
            if (result.success) {
              embed = ResponseUtil.success(
                "💰 Income Collected!",
                result.message
              );

              if (result.incomeBreakdown && result.totalIncome) {
                let breakdown = "**Income Distribution:**\n";

                // Always show cash and bank, even if 0
                breakdown += `💵 Cash: ${BotBranding.formatCurrency(
                  result.incomeBreakdown.cash
                )}\n`;
                breakdown += `🏦 Bank: ${BotBranding.formatCurrency(
                  result.incomeBreakdown.bank
                )}\n`;

                // Show crypto if any was earned
                Object.entries(result.incomeBreakdown.crypto).forEach(
                  ([coin, amount]) => {
                    if (amount > 0) {
                      breakdown += `₿ ${coin}: ${amount.toFixed(6)} coins\n`;
                    }
                  }
                );

                embed.addFields({
                  name: "📈 Income Breakdown",
                  value: breakdown,
                  inline: false,
                });
              }

              embed.setFooter({
                text: "💡 Assets generate income over time • Check back later for more!",
              });

              // First, send the private detailed response
              await interaction.editReply({ embeds: [embed] });

              // Then, send public announcement if collection is significant enough
              if (
                result.totalIncome &&
                shouldAnnounceCollection(result.totalIncome)
              ) {
                try {
                  const announcement = getCollectionAnnouncement(
                    interaction.user.username,
                    result.totalIncome
                  );

                  // Send public message to the channel (not ephemeral)
                  if (interaction.channel && "send" in interaction.channel) {
                    await interaction.channel.send({
                      content: announcement,
                    });
                  }
                } catch (announcementError) {
                  console.error(
                    "Error sending collection announcement:",
                    announcementError
                  );
                  // Don't fail the entire command if announcement fails
                }
              }
            } else {
              embed = ResponseUtil.error("Collection Failed", result.message);
              await interaction.editReply({ embeds: [embed] });
            }

            return { success: result.success };
          } catch (error: any) {
            console.error("Error collecting income:", error);

            let errorMessage = "An error occurred while collecting income.";

            // Handle specific database timeout errors
            if (
              error.message &&
              error.message.includes("transaction timeout")
            ) {
              errorMessage =
                "Income collection is taking longer than expected. Please try again in a moment.";
            } else if (
              error.message &&
              error.message.includes("Transaction already closed")
            ) {
              errorMessage =
                "Transaction timeout - your assets may be generating too much income to process quickly. Please try again.";
            }

            const embed = ResponseUtil.error("Collection Error", errorMessage);
            await interaction.editReply({ embeds: [embed] });
            return { success: false, error: "Collection failed" };
          }
        }
        case "upgrade": {
          const assetNumber = interaction.options.getInteger(
            "asset_number",
            true
          );
          const upgradeType = "income"; // Default to income upgrades
          const paymentMethod = "mixed"; // Default to mixed payment (automatic)

          // Get player's assets to find the asset by number
          const assets = await assetService.getPlayerAssets(userId);

          if (assets.length === 0) {
            const embed = ResponseUtil.error(
              "No Assets Owned",
              "You don't own any business assets yet! Use `/business buy <asset>` to purchase your first asset."
            );
            await interaction.editReply({ embeds: [embed] });
            return { success: false, error: "No assets owned" };
          }

          if (assetNumber < 1 || assetNumber > assets.length) {
            const embed = ResponseUtil.error(
              "Invalid Asset Number",
              `Please enter a number between 1 and ${assets.length}. Use \`/business list\` to see your assets with their positions.\n\n**Your Assets:**\n` +
                assets
                  .map(
                    (asset, idx) =>
                      `${idx + 1}. ${asset.name} (Level ${asset.level}/${
                        asset.template.maxLevel
                      })`
                  )
                  .join("\n")
            );
            await interaction.editReply({ embeds: [embed] });
            return { success: false, error: "Invalid asset number" };
          }

          // Get the asset by number (subtract 1 for zero-based array)
          const selectedAsset = assets[assetNumber - 1];
          const assetId = selectedAsset.id;

          // Check if asset can be upgraded
          if (selectedAsset.level >= selectedAsset.template.maxLevel) {
            const embed = ResponseUtil.error(
              "Cannot Upgrade",
              `**${selectedAsset.name}** (Position #${assetNumber}) is already at maximum level (${selectedAsset.template.maxLevel})!`
            );
            await interaction.editReply({ embeds: [embed] });
            return { success: false, error: "Asset at max level" };
          }

          const result = await assetService.upgradeAsset(
            userId,
            assetId,
            upgradeType,
            paymentMethod
          );

          let embed;
          if (result.success) {
            embed = ResponseUtil.success("🔧 Income Upgraded!", result.message);

            if (result.cost) {
              embed.addFields({
                name: "💰 Upgrade Cost",
                value: `${BotBranding.formatCurrency(
                  result.cost
                )} (paid automatically)`,
                inline: true,
              });
            }

            embed.addFields({
              name: "📊 Business Details",
              value: `**Business:** ${
                selectedAsset.name
              }\n**Position:** #${assetNumber}\n**New Level:** ${
                selectedAsset.level + 1
              }/${selectedAsset.template.maxLevel}`,
              inline: true,
            });

            embed.setFooter({
              text: "💡 Use /business list to see updated income rates",
            });
          } else {
            embed = ResponseUtil.error("Upgrade Failed", result.message);
          }

          await interaction.editReply({ embeds: [embed] });
          return { success: result.success };
        }

        default:
          const embed = ResponseUtil.error(
            "Invalid Subcommand",
            "Please use a valid subcommand: buy, list, collect, or upgrade."
          );
          await interaction.editReply({ embeds: [embed] });
          return { success: false, error: "Invalid subcommand" };
      }
    } catch (error) {
      console.error("Error in business command:", error);
      const embed = ResponseUtil.error(
        "Command Failed",
        "An error occurred while processing your business command."
      );
      await interaction.editReply({ embeds: [embed] });
      return { success: false, error: "Command execution failed" };
    }
  },

  cooldown: 3,
  category: "economy",
  description:
    "Purchase and manage business assets for passive income generation",
};

export default businessCommand;
