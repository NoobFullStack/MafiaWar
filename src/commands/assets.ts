import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { BotBranding } from "../config/bot";
import { assetTemplates } from "../data/assets";
import { AssetService } from "../services/AssetService";
import { Command, CommandContext, CommandResult } from "../types/command";
import DatabaseManager from "../utils/DatabaseManager";
import { ResponseUtil } from "../utils/ResponseUtil";

const assetsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("assets")
    .setDescription("Browse available businesses and properties to purchase")
    .addStringOption((option) =>
      option
        .setName("category")
        .setDescription("Filter by business category")
        .addChoices(
          { name: "All", value: "all" },
          { name: "Legitimate", value: "legitimate" },
          { name: "Semi-Legal", value: "semi_legal" },
          { name: "Illegal", value: "illegal" }
        )
    )
    .addBooleanOption((option) =>
      option
        .setName("available_only")
        .setDescription("Show only assets you can currently purchase")
        .setRequired(false)
    ),

  async execute(context: CommandContext): Promise<CommandResult> {
    const { interaction } = context;
    const userId = interaction.user.id;
    const userTag = interaction.user.tag;

    try {
      // Check if user has an account
      const user = await DatabaseManager.getUserForAuth(userId);
      if (!user?.character) {
        const noAccountEmbed = ResponseUtil.noAccount(userTag);
        await ResponseUtil.smartReply(interaction, {
          embeds: [noAccountEmbed],
          flags: 64,
        });
        return { success: false, error: "User not registered" };
      }

      const character = user.character;
      const category = interaction.options.getString("category") || "all";
      const availableOnly =
        interaction.options.getBoolean("available_only") || false;

      // Filter assets by category
      let filteredAssets = assetTemplates;
      if (category !== "all") {
        filteredAssets = assetTemplates.filter(
          (asset) => asset.category === category
        );
      }

      const assetService = AssetService.getInstance();

      // If showing available only, filter by requirements
      if (availableOnly) {
        const playerBalance = character.cashOnHand + character.bankBalance;
        filteredAssets = assetService.getAvailableAssets(
          character.level,
          character.reputation,
          playerBalance
        );

        // Apply category filter after availability filter
        if (category !== "all") {
          filteredAssets = filteredAssets.filter(
            (asset) => asset.category === category
          );
        }
      }

      if (filteredAssets.length === 0) {
        const embed = ResponseUtil.info(
          "🏢 No Assets Available",
          availableOnly
            ? "No assets match your current level and resources. Keep playing to unlock more!"
            : "No assets found in this category."
        );
        await ResponseUtil.smartReply(interaction, {
          embeds: [embed],
          flags: 64,
        });
        return { success: true };
      }

      // Create asset listing embed
      const embed = new EmbedBuilder()
        .setTitle("🏢 Available Business Assets")
        .setColor(BotBranding.getThemeColor()) // Use theme color
        .setDescription(
          `**Browse businesses to build your criminal empire:**\n` +
            `• Use \`/business buy <asset>\` to purchase\n` +
            `• Use \`/business list\` to manage owned assets\n` +
            `• Use \`/business collect\` to gather income`
        );

      // Add category header if filtered
      if (category !== "all") {
        const categoryNames = {
          legitimate: "Legitimate Businesses",
          semi_legal: "Semi-Legal Operations",
          illegal: "Underground Operations",
        };
        embed.setDescription(
          embed.data.description +
            `\n\n**Category:** ${
              categoryNames[category as keyof typeof categoryNames]
            }`
        );
      }

      // Group assets by category for better organization
      const groupedAssets = filteredAssets.reduce((groups, asset) => {
        const cat = asset.category;
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(asset);
        return groups;
      }, {} as Record<string, typeof filteredAssets>);

      // Add assets to embed
      Object.entries(groupedAssets).forEach(([cat, assets]) => {
        const categoryIcons = {
          legitimate: "🏪",
          semi_legal: "🎭",
          illegal: "🕴️",
        };

        const categoryNames = {
          legitimate: "Legitimate Businesses",
          semi_legal: "Semi-Legal Operations",
          illegal: "Underground Operations",
        };

        const icon = categoryIcons[cat as keyof typeof categoryIcons];
        const name = categoryNames[cat as keyof typeof categoryNames];

        let assetList = "";
        assets.forEach((asset, index) => {
          const canAfford =
            character.cashOnHand + character.bankBalance >= asset.basePrice;
          const meetsLevel =
            character.level >= (asset.requirements?.level || 1);
          const meetsRep =
            character.reputation >= (asset.requirements?.reputation || 0);
          const meetsReqs = meetsLevel && meetsRep && canAfford;

          const statusIcon = meetsReqs ? "✅" : "❌";

          // Cleaner format
          assetList += `${statusIcon} **${asset.name}**\n`;
          assetList += `💰 ${BotBranding.formatCurrency(asset.basePrice)} • 💵 ${BotBranding.formatCurrency(asset.baseIncomeRate)}/hr • 🛡️ ${asset.baseSecurityLevel}\n`;

          // Income distribution in a cleaner format
          const dist = asset.incomeDistribution;
          let incomeDisplay = "💸 ";
          if (dist.cash > 0) incomeDisplay += `${dist.cash}% Cash `;
          if (dist.bank > 0) incomeDisplay += `${dist.bank}% Bank `;
          if (dist.crypto > 0) incomeDisplay += `${dist.crypto}% Crypto`;
          assetList += `${incomeDisplay}\n`;

          // Requirements only if not met
          if (!meetsReqs) {
            const missing: string[] = [];
            if (!meetsLevel) missing.push(`Level ${asset.requirements?.level}`);
            if (!meetsRep)
              missing.push(`${asset.requirements?.reputation} reputation`);
            if (!canAfford)
              missing.push(`${BotBranding.formatCurrency(asset.basePrice)} funds`);

            assetList += `❌ **Missing:** ${missing.join(", ")}\n`;
          }

          assetList += "\n";
        });

        embed.addFields({
          name: `${icon} ${name}`,
          value: assetList.trim(),
          inline: false,
        });
      });

      // Add footer with player info
      embed.setFooter({
        text: `💰 Balance: ${BotBranding.formatCurrency(character.cashOnHand + character.bankBalance)} • Level ${character.level} • Rep: ${character.reputation}`,
      });

      // Add legend if showing filtered results
      if (!availableOnly) {
        embed.addFields({
          name: "📖 How to Read",
          value:
            `✅ **Available** - You can purchase this asset\n` +
            `❌ **Unavailable** - Missing requirements shown below\n` +
            `**Income Types:** Cash (immediate), Bank (protected), Crypto (anonymous)`,
          inline: false,
        });
      }

      await ResponseUtil.smartReply(interaction, {
        embeds: [embed],
        flags: 64,
      });
      return { success: true };
    } catch (error) {
      console.error("Error in assets command:", error);
      const embed = ResponseUtil.error(
        "Command Failed",
        "An error occurred while fetching assets."
      );
      await ResponseUtil.smartReply(interaction, {
        embeds: [embed],
        flags: 64,
      });
      return { success: false, error: "Command execution failed" };
    }
  },

  cooldown: 5,
  category: "economy",
  description:
    "Browse and purchase business assets for passive income generation",
};

export default assetsCommand;
