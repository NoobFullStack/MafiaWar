import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import { BotBranding } from "../config/bot";
import { Command, CommandContext, CommandResult } from "../types/command";
import DatabaseManager from "../utils/DatabaseManager";
import { ResponseUtil, logger } from "../utils/ResponseUtil";

const tutorialCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("tutorial")
    .setDescription("🎓 Interactive tutorial to learn game mechanics")
    .addStringOption((option) =>
      option
        .setName("topic")
        .setDescription("Choose a specific tutorial topic")
        .setRequired(false)
        .addChoices(
          { name: "📖 Complete Guide", value: "complete" },
          { name: "🔥 Crime System", value: "crimes" },
          { name: "🏢 Business & Assets", value: "business" },
          { name: "💰 Money Management", value: "money" },
          { name: "📊 Profile & Stats", value: "profile" }
        )
    ),

  async execute(context: CommandContext): Promise<CommandResult> {
    const { interaction, userId, userTag } = context;

    try {
      // Check if user has an account
      const user = await DatabaseManager.getClient().user.findUnique({
        where: { discordId: userId },
        include: {
          character: true,
        },
      });

      if (!user || !user.character) {
        const noAccountEmbed = ResponseUtil.noAccount(userTag);
        await ResponseUtil.smartReply(interaction, {
          embeds: [noAccountEmbed],
          flags: 64,
        });
        return { success: false, error: "User not registered" };
      }

      const topic = interaction.options.getString("topic") || "complete";

      // Log tutorial access
      await DatabaseManager.logAction(user.id, "tutorial_start", "success", {
        topic,
        commandUsed: "tutorial",
      });

      switch (topic) {
        case "complete":
          return await showCompleteTutorial(interaction, user, userTag);
        case "crimes":
          return await showCrimeTutorial(interaction, user, userTag);
        case "business":
          return await showBusinessTutorial(interaction, user, userTag);
        case "money":
          return await showMoneyTutorial(interaction, user, userTag);
        case "profile":
          return await showProfileTutorial(interaction, user, userTag);
        default:
          return await showCompleteTutorial(interaction, user, userTag);
      }
    } catch (error) {
      logger.error(`Tutorial command error for user ${userId}:`, error);

      const embed = ResponseUtil.error(
        "Tutorial Error",
        "An error occurred while loading the tutorial. Please try again."
      );

      await ResponseUtil.smartReply(interaction, {
        embeds: [embed],
        flags: 64,
      });
      return { success: false, error: "Failed to load tutorial" };
    }
  },

  cooldown: 5,
  category: "system",
  description: "Interactive tutorial for game mechanics",
};

// Complete tutorial with step navigation
async function showCompleteTutorial(
  interaction: any,
  user: any,
  userTag: string
): Promise<CommandResult> {
  const steps = [
    {
      id: "welcome",
      title: "🎓 Welcome to MafiaWar Tutorial",
      description:
        `**${userTag}**, welcome to your criminal empire tutorial!\n\n` +
        "This interactive guide will teach you everything you need to know about:\n\n" +
        "🔥 **Crime System** - How to commit crimes and earn money\n" +
        "🏢 **Business System** - Building your passive income empire\n" +
        "💰 **Money Management** - Cash, bank, and cryptocurrency\n" +
        "📊 **Character Progress** - Stats, levels, and reputation\n\n" +
        "Click **Next** to begin your criminal education!",
      color: BotBranding.getThemeColor(),
    },
    {
      id: "crimes",
      title: "🔥 Step 1: Crime System",
      description:
        "**Crimes are your primary source of income and experience!**\n\n" +
        "🎯 **How to commit crimes:**\n" +
        "• Use `/crime <type>` to commit specific crimes\n" +
        "• Use `/crime` to see all available crimes\n" +
        "• Higher level crimes pay more but have higher failure rates\n\n" +
        "💡 **Crime Categories:**\n" +
        "• **Petty** (Level 1+) - Low risk, low reward\n" +
        "• **Theft** (Level 5+) - Stealing cars and goods\n" +
        "• **Robbery** (Level 10+) - Banks and stores\n" +
        "• **Violence** (Level 15+) - High risk operations\n" +
        "• **White Collar** (Level 20+) - Financial crimes\n" +
        "• **Organized** (Level 25+) - Large scale operations\n\n" +
        "⚠️ **Failure consequences:** Jail time, lost money, reputation damage",
      color: 0xff6b6b,
    },
    {
      id: "business",
      title: "🏢 Step 2: Business & Assets",
      description:
        "**Build passive income streams while you sleep!**\n\n" +
        "🛍️ **Browse and buy businesses:**\n" +
        "• Use `/assets` to see all available businesses\n" +
        "• Use `/business buy <asset_name>` to purchase\n" +
        "• Use `/business list` to see your properties\n\n" +
        "💰 **Income generation:**\n" +
        "• Use `/business collect` to gather earnings\n" +
        "• Income accumulates automatically over time\n" +
        "• Higher tier businesses require higher levels\n\n" +
        "⬆️ **Upgrades:**\n" +
        "• Use `/business upgrade <asset_name>` to improve income\n" +
        "• Upgrades increase both income rate and total value\n\n" +
        "🎯 **Pro tip:** Start with `test_lemonade_stand` - cheap and perfect for learning!",
      color: 0x4ecdc4,
    },
    {
      id: "money",
      title: "💰 Step 3: Money Management",
      description:
        "**Master the three-tier money system!**\n\n" +
        "💵 **Cash (Vulnerable to theft/jail):**\n" +
        "• Used for quick purchases and crimes\n" +
        "• Lost when jailed or robbed\n" +
        "• Best for immediate transactions\n\n" +
        "🏦 **Bank (Secure but taxed):**\n" +
        "• Use `/bank deposit <amount>` to secure money\n" +
        "• Use `/bank withdraw <amount>` to access funds\n" +
        "• Safe from theft but vulnerable to IRS audits\n\n" +
        "₿ **Cryptocurrency (High risk/reward):**\n" +
        "• Use `/crypto buy <amount>` to invest\n" +
        "• Use `/crypto sell <amount>` to cash out\n" +
        "• Prices fluctuate - time your trades!\n\n" +
        "📊 **Check everything:** Use `/wallet` to see all your money at once",
      color: 0xf7b731,
    },
    {
      id: "profile",
      title: "📊 Step 4: Character Progress",
      description:
        "**Track your criminal evolution!**\n\n" +
        "🎯 **View your progress:**\n" +
        "• Use `/profile` to see complete character stats\n" +
        "• Monitor level, XP, and reputation\n" +
        "• Track your criminal achievements\n\n" +
        "📈 **Key stats to watch:**\n" +
        "• **Level:** Unlocks new crimes and businesses\n" +
        "• **Strength/Stealth/Intelligence:** Affect crime success\n" +
        "• **Reputation:** Your standing in the underworld\n" +
        "• **Net Worth:** Total value across all money types\n\n" +
        "⭐ **Leveling up:**\n" +
        "• Earn XP by committing crimes\n" +
        "• Each level increases stats and unlocks content\n" +
        "• Higher levels = access to more profitable activities",
      color: 0x5f27cd,
    },
    {
      id: "complete",
      title: "🎉 Tutorial Complete!",
      description:
        "**Congratulations! You're ready to build your criminal empire!**\n\n" +
        "🚀 **Your next steps:**\n" +
        "1. Commit a few crimes with `/crime`\n" +
        "2. Bank some money with `/bank deposit`\n" +
        "3. Buy your first business with `/assets`\n" +
        "4. Check your progress with `/profile`\n\n" +
        "💡 **Need help later?**\n" +
        "• Use `/help` for command references\n" +
        "• Use `/tutorial <topic>` to review specific topics\n" +
        "• Use `/help crimes` to see all available crimes\n\n" +
        "**Welcome to the underworld. Your empire awaits!** 🎭",
      color: 0x00d2d3,
    },
  ];

  let currentStep = 0;

  const showStep = async (stepIndex: number, editMode: boolean = false) => {
    const step = steps[stepIndex];
    const embed = new EmbedBuilder()
      .setColor(step.color)
      .setTitle(step.title)
      .setDescription(step.description)
      .setFooter({
        text: `Step ${stepIndex + 1} of ${steps.length} • ${BotBranding.getFooterText("Use the buttons to navigate")}`,
      })
      .setTimestamp();

    const buttons = new ActionRowBuilder<ButtonBuilder>();

    // Previous button (disabled for first step)
    buttons.addComponents(
      new ButtonBuilder()
        .setCustomId("tutorial_prev")
        .setLabel("Previous")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(stepIndex === 0)
        .setEmoji("⬅️")
    );

    // Next button (shows "Complete" for last step)
    buttons.addComponents(
      new ButtonBuilder()
        .setCustomId("tutorial_next")
        .setLabel(stepIndex === steps.length - 1 ? "Complete" : "Next")
        .setStyle(stepIndex === steps.length - 1 ? ButtonStyle.Success : ButtonStyle.Primary)
        .setEmoji(stepIndex === steps.length - 1 ? "✅" : "➡️")
    );

    // Add topic buttons for complete tutorial
    if (stepIndex === 0) {
      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId("tutorial_topics")
          .setLabel("Choose Topic")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("📚")
      );
    }

    if (editMode) {
      await interaction.editReply({
        embeds: [embed],
        components: [buttons],
      });
    } else {
      await ResponseUtil.smartReply(interaction, {
        embeds: [embed],
        components: [buttons],
        flags: 64,
      });
    }
  };

  await showStep(currentStep);

  // Set up button collector
  const collector = interaction.channel?.createMessageComponentCollector({
    filter: (i: any) => i.user.id === interaction.user.id,
    componentType: ComponentType.Button,
    time: 300000, // 5 minutes
  });

  if (!collector) return { success: true };

  collector.on("collect", async (buttonInteraction: any) => {
    try {
      await buttonInteraction.deferUpdate();

      switch (buttonInteraction.customId) {
        case "tutorial_prev":
          if (currentStep > 0) {
            currentStep--;
            await showStep(currentStep, true);
          }
          break;

        case "tutorial_next":
          if (currentStep < steps.length - 1) {
            currentStep++;
            await showStep(currentStep, true);
          } else {
            // Tutorial completed
            collector.stop();
            await DatabaseManager.logAction(user.id, "tutorial_complete", "success", {
              topic: "complete",
              stepsCompleted: steps.length,
            });
          }
          break;

        case "tutorial_topics":
          collector.stop();
          await showTopicSelection(buttonInteraction, user, userTag);
          break;
      }
    } catch (error) {
      logger.error("Error handling tutorial navigation", error);
    }
  });

  collector.on("end", () => {
    // Disable buttons after timeout
    const disabledButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("tutorial_prev")
        .setLabel("Previous")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
        .setEmoji("⬅️"),
      new ButtonBuilder()
        .setCustomId("tutorial_next")
        .setLabel("Next")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true)
        .setEmoji("➡️")
    );

    interaction.editReply({ components: [disabledButtons] }).catch(() => {});
  });

  return { success: true };
}

// Topic selection menu
async function showTopicSelection(
  interaction: any,
  user: any,
  userTag: string
): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(BotBranding.getThemeColor())
    .setTitle("📚 Choose Tutorial Topic")
    .setDescription(
      "Select which aspect of the game you'd like to learn about:\n\n" +
      "🔥 **Crime System** - How to commit crimes and earn money\n" +
      "🏢 **Business & Assets** - Building passive income streams\n" +
      "💰 **Money Management** - Cash, bank, and crypto systems\n" +
      "📊 **Profile & Stats** - Character progression and stats"
    )
    .setFooter({
      text: BotBranding.getFooterText("Choose from the menu below"),
    });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("tutorial_topic_select")
    .setPlaceholder("Choose a tutorial topic...")
    .addOptions([
      {
        label: "Crime System",
        value: "crimes",
        description: "Learn how to commit crimes and earn money",
        emoji: "🔥",
      },
      {
        label: "Business & Assets",
        value: "business",
        description: "Build your passive income empire",
        emoji: "🏢",
      },
      {
        label: "Money Management",
        value: "money",
        description: "Master cash, bank, and cryptocurrency",
        emoji: "💰",
      },
      {
        label: "Profile & Stats",
        value: "profile",
        description: "Track your character progression",
        emoji: "📊",
      },
    ]);

  const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  await interaction.editReply({
    embeds: [embed],
    components: [actionRow],
  });

  // Set up collector for topic selection
  const collector = interaction.channel?.createMessageComponentCollector({
    filter: (i: any) => i.user.id === interaction.user.id,
    componentType: ComponentType.StringSelect,
    time: 60000,
  });

  if (!collector) return;

  collector.on("collect", async (selectInteraction: any) => {
    try {
      await selectInteraction.deferUpdate();
      const selectedTopic = selectInteraction.values[0];

      collector.stop();

      switch (selectedTopic) {
        case "crimes":
          await showCrimeTutorial(selectInteraction, user, userTag);
          break;
        case "business":
          await showBusinessTutorial(selectInteraction, user, userTag);
          break;
        case "money":
          await showMoneyTutorial(selectInteraction, user, userTag);
          break;
        case "profile":
          await showProfileTutorial(selectInteraction, user, userTag);
          break;
      }
    } catch (error) {
      logger.error("Error handling topic selection", error);
    }
  });

  collector.on("end", () => {
    selectMenu.setDisabled(true);
    interaction.editReply({ components: [actionRow] }).catch(() => {});
  });
}

// Specific tutorial implementations
async function showCrimeTutorial(
  interaction: any,
  user: any,
  userTag: string
): Promise<CommandResult> {
  const embed = new EmbedBuilder()
    .setColor(0xff6b6b)
    .setTitle("🔥 Crime System Tutorial")
    .setDescription(
      "**Master the art of criminal activities!**\n\n" +
      "Crimes are your main source of income and experience. Here's everything you need to know:"
    )
    .addFields(
      {
        name: "🎯 Basic Commands",
        value:
          "`/crime` - See all available crimes\n" +
          "`/crime <type>` - Commit a specific crime\n" +
          "`/help crimes` - Detailed crime information",
        inline: false,
      },
      {
        name: "📊 Crime Categories & Levels",
        value:
          "**Petty** (Lv 1+) - Pickpocketing, shoplifting\n" +
          "**Theft** (Lv 5+) - Car theft, burglary\n" +
          "**Robbery** (Lv 10+) - Bank jobs, store heists\n" +
          "**Violence** (Lv 15+) - Intimidation, assault\n" +
          "**White Collar** (Lv 20+) - Fraud, embezzlement\n" +
          "**Organized** (Lv 25+) - Large-scale operations",
        inline: true,
      },
      {
        name: "💰 Risk vs Reward",
        value:
          "• Higher level crimes pay more\n" +
          "• Success depends on your stats\n" +
          "• Failure = jail time & lost money\n" +
          "• XP earned regardless of outcome\n" +
          "• Critical successes = bonus rewards",
        inline: true,
      },
      {
        name: "⚡ Pro Tips",
        value:
          "• Start with petty crimes to build stats\n" +
          "• Bank money before risky crimes\n" +
          "• Level up to unlock better crimes\n" +
          "• Pay attention to stat requirements\n" +
          "• Use `/jail status` if you get caught",
        inline: false,
      },
      {
        name: "🎮 Try It Now!",
        value:
          "Ready to start? Try:\n" +
          "`/crime pickpocket` - Safe beginner crime\n" +
          "`/crime` - See what's available to you",
        inline: false,
      }
    )
    .setFooter({
      text: BotBranding.getFooterText("Your criminal career starts here!"),
    })
    .setTimestamp();

  await interaction.editReply({
    embeds: [embed],
    components: [],
  });

  await DatabaseManager.logAction(user.id, "tutorial_complete", "success", {
    topic: "crimes",
  });

  return { success: true };
}

async function showBusinessTutorial(
  interaction: any,
  user: any,
  userTag: string
): Promise<CommandResult> {
  const embed = new EmbedBuilder()
    .setColor(0x4ecdc4)
    .setTitle("🏢 Business & Assets Tutorial")
    .setDescription(
      "**Build your passive income empire!**\n\n" +
      "Businesses generate money automatically while you're offline. Here's how to dominate:"
    )
    .addFields(
      {
        name: "🛍️ Shopping for Businesses",
        value:
          "`/assets` - Browse all available businesses\n" +
          "`/assets <category>` - Filter by type\n" +
          "`/assets owned` - See your properties",
        inline: false,
      },
      {
        name: "💰 Buying & Managing",
        value:
          "`/business buy <name>` - Purchase a business\n" +
          "`/business list` - View your portfolio\n" +
          "`/business collect` - Gather earnings\n" +
          "`/business upgrade <name>` - Improve income",
        inline: true,
      },
      {
        name: "📊 Business Types",
        value:
          "**Shops** - Steady, reliable income\n" +
          "**Nightclubs** - Higher income, higher cost\n" +
          "**Warehouses** - Industrial operations\n" +
          "**Properties** - Real estate investments\n" +
          "**Special** - Unique opportunities",
        inline: true,
      },
      {
        name: "⬆️ Growth Strategy",
        value:
          "• Start small with cheap businesses\n" +
          "• Reinvest profits into upgrades\n" +
          "• Higher levels unlock better properties\n" +
          "• Diversify your portfolio\n" +
          "• Collect regularly for maximum profit",
        inline: false,
      },
      {
        name: "🎯 Beginner Recommendation",
        value:
          "**Start Here:** `test_lemonade_stand`\n" +
          "• Only $100 to buy\n" +
          "• Perfect for learning the system\n" +
          "• Quick income to fund bigger investments",
        inline: false,
      },
      {
        name: "🎮 Try It Now!",
        value:
          "Ready to invest? Try:\n" +
          "`/assets` - See what's available\n" +
          "`/business buy test_lemonade_stand` - Your first business!",
        inline: false,
      }
    )
    .setFooter({
      text: BotBranding.getFooterText("Your empire starts with one business!"),
    })
    .setTimestamp();

  await interaction.editReply({
    embeds: [embed],
    components: [],
  });

  await DatabaseManager.logAction(user.id, "tutorial_complete", "success", {
    topic: "business",
  });

  return { success: true };
}

async function showMoneyTutorial(
  interaction: any,
  user: any,
  userTag: string
): Promise<CommandResult> {
  const embed = new EmbedBuilder()
    .setColor(0xf7b731)
    .setTitle("💰 Money Management Tutorial")
    .setDescription(
      "**Master the three-tier money system!**\n\n" +
      "MafiaWar features a sophisticated financial system with different risk levels:"
    )
    .addFields(
      {
        name: "💵 Cash - Fast & Risky",
        value:
          "• Used for crimes and quick purchases\n" +
          "• **Risk:** Lost when jailed or robbed\n" +
          "• **Benefit:** Instantly available\n" +
          "• Keep minimal amounts for safety",
        inline: true,
      },
      {
        name: "🏦 Bank - Secure but Taxed",
        value:
          "• Protected from theft and jail\n" +
          "• **Risk:** IRS audits and seizures\n" +
          "• **Benefit:** Interest and security\n" +
          "• Upgrade tiers for better protection",
        inline: true,
      },
      {
        name: "₿ Crypto - High Risk/Reward",
        value:
          "• Market fluctuations affect value\n" +
          "• **Risk:** Volatile price swings\n" +
          "• **Benefit:** Potential massive gains\n" +
          "• Time your trades carefully",
        inline: true,
      },
      {
        name: "🏦 Banking Commands",
        value:
          "`/bank deposit <amount>` - Secure your cash\n" +
          "`/bank withdraw <amount>` - Access funds\n" +
          "`/bank balance` - Check account\n" +
          "`/bank upgrade` - Better tier = better protection",
        inline: false,
      },
      {
        name: "₿ Crypto Commands",
        value:
          "`/crypto prices` - Check market rates\n" +
          "`/crypto buy <amount>` - Invest with cash/bank\n" +
          "`/crypto sell <amount>` - Cash out profits\n" +
          "`/crypto portfolio` - View holdings",
        inline: false,
      },
      {
        name: "📊 Money Overview",
        value:
          "`/wallet` - See ALL your money at once\n" +
          "Shows cash, bank, crypto, and total net worth\n" +
          "Your complete financial picture in one command",
        inline: false,
      },
      {
        name: "💡 Smart Money Tips",
        value:
          "• Bank most of your crime earnings\n" +
          "• Keep small cash for immediate needs\n" +
          "• Invest 10-20% in crypto for growth\n" +
          "• Watch for market opportunities\n" +
          "• Upgrade bank tier as you grow",
        inline: false,
      },
      {
        name: "🎮 Try It Now!",
        value:
          "Practice with your money:\n" +
          "`/wallet` - See your current finances\n" +
          "`/bank deposit 500` - Secure some cash",
        inline: false,
      }
    )
    .setFooter({
      text: BotBranding.getFooterText("Smart money management = long-term success!"),
    })
    .setTimestamp();

  await interaction.editReply({
    embeds: [embed],
    components: [],
  });

  await DatabaseManager.logAction(user.id, "tutorial_complete", "success", {
    topic: "money",
  });

  return { success: true };
}

async function showProfileTutorial(
  interaction: any,
  user: any,
  userTag: string
): Promise<CommandResult> {
  const embed = new EmbedBuilder()
    .setColor(0x5f27cd)
    .setTitle("📊 Profile & Stats Tutorial")
    .setDescription(
      "**Track your criminal evolution!**\n\n" +
      "Your character profile shows your progress and helps you plan your next moves:"
    )
    .addFields(
      {
        name: "📊 Core Stats",
        value:
          "**Strength** - Physical crimes & intimidation\n" +
          "**Stealth** - Theft & covert operations\n" +
          "**Intelligence** - Hacking & white-collar crimes\n" +
          "*Stats improve with successful crimes*",
        inline: true,
      },
      {
        name: "⭐ Progression",
        value:
          "**Level** - Unlocks crimes & businesses\n" +
          "**Experience (XP)** - Earned from crimes\n" +
          "**Reputation** - Your underworld standing\n" +
          "*Higher levels = better opportunities*",
        inline: true,
      },
      {
        name: "💰 Wealth Tracking",
        value:
          "**Net Worth** - Total value across all money\n" +
          "**Asset Value** - Business portfolio worth\n" +
          "**Income Rate** - Passive earnings per hour\n" +
          "*Build wealth through smart investments*",
        inline: true,
      },
      {
        name: "🎯 Profile Command",
        value:
          "`/profile` - View your complete character sheet\n" +
          "Shows all stats, money, assets, and progress\n" +
          "Your criminal resume in one command",
        inline: false,
      },
      {
        name: "📈 Growth Strategies",
        value:
          "• **Focus on crimes** matching your best stats\n" +
          "• **Level up** to unlock new opportunities\n" +
          "• **Build reputation** through consistent success\n" +
          "• **Diversify income** with multiple assets\n" +
          "• **Set goals** for next level milestones",
        inline: false,
      },
      {
        name: "🔍 Reading Your Profile",
        value:
          "**Criminal Stats** - Your crime capabilities\n" +
          "**Financial Summary** - Money across all types\n" +
          "**Asset Portfolio** - Business investments\n" +
          "**Progress Bars** - XP to next level\n" +
          "**Account Age** - Your criminal longevity",
        inline: false,
      },
      {
        name: "🎮 Try It Now!",
        value:
          "Check your progress:\n" +
          "`/profile` - See your complete character\n" +
          "Plan your next move based on your stats!",
        inline: false,
      }
    )
    .setFooter({
      text: BotBranding.getFooterText("Knowledge is power in the underworld!"),
    })
    .setTimestamp();

  await interaction.editReply({
    embeds: [embed],
    components: [],
  });

  await DatabaseManager.logAction(user.id, "tutorial_complete", "success", {
    topic: "profile",
  });

  return { success: true };
}

export default tutorialCommand;