import {
  ActionRowBuilder,
  ComponentType,
  EmbedBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import { BotBranding } from "../config/bot";
import { LevelCalculator } from "../config/economy";
import { CrimeService } from "../services/CrimeService";
import { Command, CommandContext, CommandResult } from "../types/command";
import DatabaseManager from "../utils/DatabaseManager";
import { ResponseUtil, logger } from "../utils/ResponseUtil";

// Helper function to get category icons for crimes
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

const helpCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("View all available commands and game information")
    .addStringOption((option) =>
      option
        .setName("category")
        .setDescription("Show help for a specific category")
        .setRequired(false)
        .addChoices(
          { name: "All Commands", value: "all" },
          { name: "Getting Started", value: "getting-started" },
          { name: "User Management", value: "user" },
          { name: "Economy & Money", value: "economy" },
          { name: "Crime & Activities", value: "crime" },
          { name: "Business & Assets", value: "business" },
          { name: "Available Crimes", value: "crimes" },
          { name: "System & Info", value: "system" }
        )
    ),

  async execute(context: CommandContext): Promise<CommandResult> {
    const { interaction, userId, userTag } = context;
    const category = interaction.options.getString("category") || "all";

    try {
      // Check if user has an account for crime-specific functionality
      let user = null;
      let character = null;
      try {
        user = await DatabaseManager.getUserForAuth(userId);
        character = user?.character;
      } catch (error) {
        // User doesn't exist, that's okay for help command
      }

      if (category === "crimes") {
        return await showCrimesHelp(interaction, userId, userTag, character);
      }

      const embed = createHelpEmbed(category, character);

      // Add interactive menu for different categories
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("help_category")
        .setPlaceholder("Select a help category...")
        .addOptions([
          {
            label: "🎯 All Commands",
            description: "Complete command overview",
            value: "all",
          },
          {
            label: "🚀 Getting Started",
            description: "New player guide",
            value: "getting-started",
          },
          {
            label: "👤 User Management",
            description: "Account creation & deletion",
            value: "user",
          },
          {
            label: "💰 Economy & Money",
            description: "Banking, wallet, crypto trading",
            value: "economy",
          },
          {
            label: "🔫 Crime & Activities",
            description: "Committing crimes, jail system",
            value: "crime",
          },
          {
            label: "🏢 Business & Assets",
            description: "Buying businesses, managing assets",
            value: "business",
          },
          {
            label: "📋 Available Crimes",
            description: "View all crimes & requirements",
            value: "crimes",
          },
          {
            label: "⚙️ System & Info",
            description: "Bot status, ping, profile",
            value: "system",
          },
        ]);

      const actionRow =
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          selectMenu
        );

      const reply = await ResponseUtil.smartReply(interaction, {
        embeds: [embed],
        components: [actionRow],
        flags: 64,
      });

      // Handle menu interactions - use alternative approach for ephemeral interactions
      const collector = interaction.channel?.createMessageComponentCollector({
        filter: (i: any) => i.user.id === interaction.user.id,
        componentType: ComponentType.StringSelect,
        time: 300000, // 5 minutes
      });

      // Alternative collector for when channel is not available (ephemeral interactions)
      let altCollector = null;
      if (!collector && reply && typeof reply === 'object' && 'createMessageComponentCollector' in reply) {
        altCollector = (reply as any).createMessageComponentCollector({
          filter: (i: any) => i.user.id === interaction.user.id,
          componentType: ComponentType.StringSelect,
          time: 300000, // 5 minutes
        });
      }

      const activeCollector = collector || altCollector;
      if (activeCollector) {
        activeCollector.on("collect", async (selectInteraction: any) => {
          try {
            const selectedCategory = selectInteraction.values[0];

            if (selectedCategory === "crimes") {
              await showCrimesHelp(
                selectInteraction,
                userId,
                userTag,
                character
              );
            } else {
              const newEmbed = createHelpEmbed(selectedCategory, character);
              await selectInteraction.update({
                embeds: [newEmbed],
                components: [actionRow],
              });
            }
          } catch (error) {
            logger.error("Error handling help category selection", error);
          }
        });

        activeCollector.on("end", () => {
          // Disable menu after timeout
          selectMenu.setDisabled(true);
          interaction.editReply({ components: [actionRow] }).catch(() => {});
        });
      }

      return { success: true };
    } catch (error) {
      logger.error(`Help command error for user ${userId}:`, error);

      const embed = ResponseUtil.error(
        "Error",
        "Failed to load help information. Please try again."
      );

      await ResponseUtil.smartReply(interaction, {
        embeds: [embed],
        flags: 64,
      });
      return { success: false, error: "Failed to load help" };
    }
  },

  cooldown: 5,
  category: "system",
  description: "Get help with commands and game mechanics",
};

function createHelpEmbed(category: string, character: any): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(BotBranding.getThemeColor())
    .setTimestamp();

  switch (category) {
    case "getting-started":
      embed
        .setTitle("🚀 Getting Started Guide")
        .setDescription(
          `Welcome to ${BotBranding.getName()}! Here's how to begin your criminal empire:`
        )
        .addFields(
          {
            name: "1️⃣ Create Your Character",
            value:
              "`/user-create` - Join the underworld and create your criminal persona",
            inline: false,
          },
          {
            name: "2️⃣ Check Your Status",
            value:
              "`/profile` - View your character stats, money, and progress",
            inline: false,
          },
          {
            name: "3️⃣ Start Earning Money",
            value:
              "`/crime <type>` - Commit crimes to earn money and experience\n`/help crimes` - See all available crimes",
            inline: false,
          },
          {
            name: "4️⃣ Manage Your Money",
            value:
              "`/wallet` - View all your money\n`/bank deposit <amount>` - Secure your earnings",
            inline: false,
          },
          {
            name: "5️⃣ Grow Your Empire",
            value:
              "`/assets` - Browse businesses to buy\n`/business buy <asset>` - Purchase income-generating assets",
            inline: false,
          },
          {
            name: "💡 Pro Tips",
            value:
              "• Bank your money to keep it safe from jail\n• Level up to unlock better crimes\n• Buy businesses for passive income\n• Use crypto trading for high-risk/high-reward",
            inline: false,
          }
        );
      break;

    case "user":
      embed
        .setTitle("👤 User Management Commands")
        .setDescription("Manage your account and character")
        .addFields(
          {
            name: "`/user-create`",
            value: "🎭 Create your criminal character and join the game",
            inline: false,
          },
          {
            name: "`/user-delete`",
            value: "⚠️ Permanently delete your account and all data",
            inline: false,
          },
          {
            name: "`/profile`",
            value: "📊 View your character stats, level, and progress",
            inline: false,
          }
        );
      break;

    case "economy":
      embed
        .setTitle("💰 Economy & Money Commands")
        .setDescription("Manage your finances across multiple money types")
        .addFields(
          {
            name: "`/wallet`",
            value: "💼 View your complete money portfolio (cash, bank, crypto)",
            inline: false,
          },
          {
            name: "`/bank`",
            value:
              "🏦 **deposit** `<amount>` - Deposit cash\n🏦 **withdraw** `<amount>` - Withdraw money\n🏦 **balance** - Check bank balance\n🏦 **upgrade** - Upgrade account tier",
            inline: false,
          },
          {
            name: "`/crypto`",
            value:
              "₿ **price** - View current market price\n₿ **buy** `<amount>` - Purchase cryptocurrency\n₿ **sell** `<amount>` - Sell cryptocurrency\n₿ **portfolio** - View crypto holdings",
            inline: false,
          }
        );
      break;

    case "crime":
      embed
        .setTitle("🔫 Crime & Activities")
        .setDescription("Criminal activities and consequences")
        .addFields(
          {
            name: "`/crime <type>`",
            value: "🎯 Commit a specific crime for money and XP",
            inline: false,
          },
          {
            name: "`/help crimes`",
            value: "📋 View all available crimes and requirements",
            inline: false,
          },
          {
            name: "`/jail`",
            value:
              "⛓️ **status** - Check if you're in jail\n⛓️ **bribe** - Pay to get out of jail early",
            inline: false,
          }
        );
      break;

    case "business":
      embed
        .setTitle("🏢 Business & Assets")
        .setDescription("Build your criminal empire through business ownership")
        .addFields(
          {
            name: "`/assets`",
            value:
              "🏪 Browse available businesses and properties to purchase\nFilter by category or show only affordable options",
            inline: false,
          },
          {
            name: "`/business`",
            value:
              "💼 **buy** `<asset>` - Purchase a business\n💼 **list** - View your owned businesses\n💼 **collect** - Collect profits from all businesses\n💼 **sell** `<asset>` - Sell a business",
            inline: false,
          }
        );
      break;

    case "system":
      embed
        .setTitle("⚙️ System & Information")
        .setDescription("Bot status and utility commands")
        .addFields(
          {
            name: "`/ping`",
            value: "🏓 Check if the bot is responsive",
            inline: false,
          },
          {
            name: "`/help`",
            value: "❓ View this help menu (you're here!)",
            inline: false,
          }
        );
      break;

    default: // "all"
      embed
        .setTitle(`❓ ${BotBranding.getName()} - Command Help`)
        .setDescription(
          "Welcome to the ultimate Discord crime MMO! Use the menu below to explore different command categories."
        )
        .addFields(
          {
            name: "🚀 New Player?",
            value:
              "Select **Getting Started** from the menu below for a step-by-step guide!",
            inline: false,
          },
          {
            name: "📋 Quick Reference",
            value:
              "**Essential Commands:**\n`/user-create` - Create character\n`/profile` - View stats\n`/crime <type>` - Commit crimes\n`/wallet` - Check money\n`/assets` - Browse businesses",
            inline: true,
          },
          {
            name: "💡 Game Features",
            value:
              "• Multi-tier money system\n• Level-based progression\n• Business ownership\n• Cryptocurrency trading\n• Jail system with bribes",
            inline: true,
          }
        );

      if (character) {
        embed.addFields({
          name: "🎭 Your Character",
          value: `**${character.name}** | Level ${character.level}\nUse \`/profile\` for detailed stats`,
          inline: false,
        });
      }
      break;
  }

  embed.setFooter({
    text: `${BotBranding.getName()} • Use the menu below to explore different categories`,
  });

  return embed;
}

async function showCrimesHelp(
  interaction: any,
  userId: string,
  userTag: string,
  character: any
): Promise<CommandResult> {
  try {
    if (!character) {
      const noAccountEmbed = ResponseUtil.noAccount(userTag);
      await interaction.reply({ embeds: [noAccountEmbed], flags: 64 });
      return { success: false, error: "User not registered" };
    }

    const currentLevel = LevelCalculator.getLevelFromXP(character.experience);

    // Get available crimes
    const availableCrimes = CrimeService.getAvailableCrimes(currentLevel);
    const allCrimes = CrimeService.getAvailableCrimes(50); // Get all crimes to show locked ones

    // Create embed
    const embed = ResponseUtil.info(
      "🔫 Available Crimes",
      `**Level ${character.level}** | ${availableCrimes.length} crimes unlocked\n\n`
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
        category.charAt(0).toUpperCase() + category.slice(1).replace("_", " ");

      const crimeList = crimes
        .map((crime) => {
          const isAvailable = availableCrimes.some((c) => c.id === crime.id);
          const levelReq = crime.requirements?.level || 1;
          const icon = isAvailable ? "✅" : "🔒";

          // More compact format: Name | Level | Reward
          return `${icon} **${
            crime.name
          }** | Lv.${levelReq} | ${BotBranding.formatCurrency(
            crime.rewardMin
          )}-${BotBranding.formatCurrency(crime.rewardMax)}`;
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

    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.reply({ embeds: [embed], flags: 64 });
    }

    return { success: true };
  } catch (error) {
    logger.error(`Crimes help error for user ${userId}:`, error);

    const embed = ResponseUtil.error(
      "Error",
      "Failed to load crime information. Please try again."
    );

    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.reply({ embeds: [embed], flags: 64 });
    }
    return { success: false, error: "Failed to load crimes" };
  }
}

export default helpCommand;
