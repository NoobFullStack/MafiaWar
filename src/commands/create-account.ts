import { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  ComponentType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from "discord.js";
import { Command, CommandContext, CommandResult } from "../types/command";
import DatabaseManager from "../utils/DatabaseManager";
import { ResponseUtil, logger } from "../utils/ResponseUtil";

const createAccountCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("create-account")
    .setDescription("🎭 Create your MafiaWar criminal character and start your empire"),

  async execute(context: CommandContext): Promise<CommandResult> {
    const { interaction, userId, userTag } = context;

    try {
      // Check if user already exists
      const existingUser = await DatabaseManager.getClient().user.findUnique({
        where: { discordId: userId },
        include: {
          character: true,
        },
      });

      // If user already exists, redirect to profile
      if (existingUser) {
        const alreadyExistsEmbed = ResponseUtil.info(
          "Account Already Exists",
          `**${userTag}**, you already have a MafiaWar account!`
        ).addFields(
          {
            name: "🎮 Your Account",
            value: existingUser.character 
              ? `• Character: **${existingUser.character.name}** (Level ${existingUser.character.level})\n• Use \`/profile\` to view your stats\n• Use \`/wallet\` to check your money`
              : "• Character data found but corrupted\n• Contact an administrator for help",
            inline: false,
          },
          {
            name: "💡 Available Commands",
            value: "• \`/profile\` - View your character\n• \`/wallet\` - Check your finances\n• \`/crimes\` - See available activities\n• \`/delete-account\` - Start over (permanent)",
            inline: false,
          }
        );

        await ResponseUtil.smartReply(interaction, { embeds: [alreadyExistsEmbed], flags: 64 });
        return { success: true };
      }

      // User doesn't exist - show registration flow
      await showRegistrationFlow(interaction, userTag, userId);
      return { success: true };

    } catch (error) {
      logger.error("Error in create-account command", error);

      const errorEmbed = ResponseUtil.error(
        "Account Creation Error",
        "Failed to process account creation request. Please try again later."
      );

      await ResponseUtil.smartReply(interaction, { embeds: [errorEmbed], flags: 64 });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  cooldown: 10,
  category: "account",
  description: "Create your criminal character and join the MafiaWar underworld",
};

// Helper functions for registration flow
async function showRegistrationFlow(interaction: any, userTag: string, userId: string) {
  const welcomeEmbed = new EmbedBuilder()
    .setColor(0x800080) // Mafia purple
    .setTitle("🎭 Welcome to MafiaWar!")
    .setDescription(
      `**${userTag}**, you're about to enter the criminal underworld!\n\n` +
      "🔥 **Build your criminal empire** from the ground up\n" +
      "💰 **Manage a multi-tier money system** (Cash, Bank, Crypto)\n" +
      "🎯 **Level up through 50 progression levels**\n" +
      "🔫 **Commit strategic crimes** for money and reputation\n" +
      "🏢 **Own and manage criminal assets**\n" +
      "👥 **Join gangs** and dominate the streets\n\n" +
      "Ready to create your criminal character?"
    )
    .addFields(
      {
        name: "🛡️ Privacy First",
        value: "All your financial information will be kept private and only visible to you.",
        inline: false,
      },
      {
        name: "🎮 Game Features",
        value: "• XP & Level progression\n• Strategic crime system\n• Asset management\n• Gang warfare",
        inline: true,
      },
      {
        name: "💡 Getting Started",
        value: "• Create your character\n• Start with $1,000 cash\n• Level 1 with basic stats\n• Begin your criminal journey",
        inline: true,
      }
    )
    .setFooter({ text: "Click 'Create Character' to begin your criminal career!" })
    .setTimestamp();

  const actionRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('create_character')
        .setLabel('🎭 Create Character')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('learn_more')
        .setLabel('📖 Learn More')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('cancel_registration')
        .setLabel('❌ Not Now')
        .setStyle(ButtonStyle.Danger)
    );

  await ResponseUtil.smartReply(interaction, {
    embeds: [welcomeEmbed],
    components: [actionRow],
    flags: 64 // Ephemeral
  });

  // Handle button interactions with shorter timeout to prevent Discord expiration
  const filter = (i: any) => i.user.id === interaction.user.id;
  const collector = interaction.channel?.createMessageComponentCollector({
    filter,
    componentType: ComponentType.Button,
    time: 120000 // 2 minutes instead of 5 to prevent expiration
  });

  if (collector) {
    collector.on('collect', async (i: any) => {
      try {
        // Check if interaction has already been replied to
        if (i.replied || i.deferred) {
          return;
        }

        if (i.customId === 'create_character') {
          await showCharacterCreationModal(i, userId, userTag);
        } else if (i.customId === 'learn_more') {
          await showGameInfo(i, userId, userTag);
        } else if (i.customId === 'cancel_registration') {
          await cancelRegistration(i);
        }
      } catch (error) {
        logger.error("Error handling button interaction", error);
        
        // If interaction expired or already handled, try to send ephemeral response
        try {
          if (!i.replied && !i.deferred) {
            await i.reply({
              content: "⚠️ This interaction has expired. Please use `/create-account` again.",
              flags: 64
            });
          }
        } catch (e) {
          // Ignore errors from trying to reply to expired interactions
        }
        if (error instanceof Error && error.message?.includes('Unknown interaction')) {
          try {
            await i.followUp({
              content: "⏰ This interaction has expired. Please run `/create-account` again to create your character.",
              flags: 64
            });
          } catch (followUpError) {
            logger.error("Failed to send follow-up message", followUpError);
          }
        }
      }
    });

    collector.on('end', () => {
      // Disable buttons after timeout
      actionRow.components.forEach(button => button.setDisabled(true));
      interaction.editReply({ components: [actionRow] }).catch(() => {});
    });
  }
}

async function showCharacterCreationModal(interaction: any, userId: string, userTag: string) {
  try {
    // Check if interaction is still valid
    if (interaction.replied || interaction.deferred) {
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId('character_creation')
      .setTitle('🎭 Create Your Criminal Character');

    const nameInput = new TextInputBuilder()
      .setCustomId('character_name')
      .setLabel('Criminal Alias (Character Name)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Enter your character name (e.g., "Tony Soprano", "Vito")')
      .setRequired(true)
      .setMinLength(2)
      .setMaxLength(30);

    const backgroundInput = new TextInputBuilder()
      .setCustomId('character_background')
      .setLabel('Criminal Background (Optional)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Tell us about your character\'s background story...')
      .setRequired(false)
      .setMaxLength(500);

    const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput);
    const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(backgroundInput);

    modal.addComponents(firstActionRow, secondActionRow);

    await interaction.showModal(modal);

    // Handle modal submission with shorter timeout
    try {
      const submitted = await interaction.awaitModalSubmit({
        time: 120000, // 2 minutes
        filter: (i: any) => i.user.id === interaction.user.id,
      });

      const characterName = submitted.fields.getTextInputValue('character_name');
      const characterBackground = submitted.fields.getTextInputValue('character_background') || 'A mysterious figure entering the criminal underworld...';

      await createCharacterConfirmation(submitted, characterName, characterBackground, userId, userTag);
    } catch (error) {
      logger.error("Modal submission timeout or error", error);
    }
  } catch (error) {
    logger.error("Error showing character creation modal", error);
  }
}

async function createCharacterConfirmation(interaction: any, characterName: string, background: string, userId: string, userTag: string) {
  const confirmEmbed = new EmbedBuilder()
    .setColor(0x800080)
    .setTitle('🎭 Confirm Character Creation')
    .setDescription(`**Character Name:** ${characterName}\n**Background:** ${background}`)
    .addFields(
      {
        name: '💰 Starting Resources',
        value: '• $1,000 cash on hand\n• $0 in bank\n• No cryptocurrency',
        inline: true,
      },
      {
        name: '📊 Starting Stats',
        value: '• Strength: 10\n• Stealth: 10\n• Intelligence: 10',
        inline: true,
      },
      {
        name: '🎯 Level & XP',
        value: '• Level: 1\n• Experience: 0\n• Reputation: 0',
        inline: true,
      }
    )
    .setFooter({ text: 'Click "Confirm" to create your character and start your criminal career!' });

  const confirmRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_character')
        .setLabel('✅ Confirm & Create')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('modify_character')
        .setLabel('✏️ Modify Details')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('cancel_character')
        .setLabel('❌ Cancel')
        .setStyle(ButtonStyle.Danger)
    );

  await ResponseUtil.smartReply(interaction, {
    embeds: [confirmEmbed],
    components: [confirmRow],
    flags: 64
  });

  // Handle confirmation with shorter timeout
  const filter = (i: any) => i.user.id === interaction.user.id;
  const collector = interaction.channel?.createMessageComponentCollector({
    filter,
    componentType: ComponentType.Button,
    time: 120000 // 2 minutes
  });

  if (collector) {
    collector.on('collect', async (i: any) => {
      try {
        if (i.customId === 'confirm_character') {
          await finalizeCharacterCreation(i, characterName, background, userId, userTag);
        } else if (i.customId === 'modify_character') {
          await showCharacterCreationModal(i, userId, userTag);
        } else if (i.customId === 'cancel_character') {
          await cancelRegistration(i);
        }
      } catch (error) {
        logger.error("Error in confirmation handler", error);
        
        if (error instanceof Error && error.message?.includes('Unknown interaction')) {
          try {
            await i.followUp({
              content: "⏰ This interaction has expired. Please run `/create-account` again.",
              flags: 64
            });
          } catch (followUpError) {
            logger.error("Failed to send follow-up message", followUpError);
          }
        }
      }
    });
  }
}

async function finalizeCharacterCreation(interaction: any, characterName: string, background: string, userId: string, userTag: string) {
  try {
    // Show loading message
    const loadingEmbed = new EmbedBuilder()
      .setColor(0xffaa00)
      .setTitle("🔄 Creating Character...")
      .setDescription("Please wait while we set up your criminal empire...")
      .setTimestamp();

    await interaction.update({
      embeds: [loadingEmbed],
      components: [],
    });

    // Create the user and character
    const user = await DatabaseManager.getClient().user.create({
      data: {
        discordId: userId,
        username: userTag,
        character: {
          create: {
            name: characterName,
            stats: {
              strength: 10,
              stealth: 10,
              intelligence: 10,
              background: background,
            },
            cashOnHand: 1000, // Starting money
            bankBalance: 0,
            cryptoWallet: "{}",
            money: 0, // Legacy field
            reputation: 0,
            level: 1,
            experience: 0,
          },
        },
      },
      include: {
        character: true,
        assets: true,
        gangs: true,
      },
    });

    // Success embed
    const successEmbed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🎉 Character Created Successfully!')
      .setDescription(`Welcome to the underworld, **${characterName}**!`)
      .addFields(
        {
          name: '🎮 Next Steps',
          value: '• Use `/wallet` to check your money\n• Use `/crimes` to see available activities\n• Use `/crime <type>` to start earning\n• Use `/profile` to see your stats',
          inline: false,
        },
        {
          name: '💡 Pro Tips',
          value: '• All financial info is private to you\n• Balance cash, bank, and crypto strategically\n• Level up by gaining experience\n• Build your criminal reputation\n• Use `/delete-account` if you ever want to start over',
          inline: false,
        }
      )
      .setFooter({ text: 'Your criminal empire starts now!' })
      .setTimestamp();

    await interaction.editReply({
      embeds: [successEmbed],
      components: [], // Remove buttons
    });

    // Log the creation
    await DatabaseManager.logAction(user.id, "character_creation", "success", {
      characterName,
      background,
      commandUsed: "create-account",
    });

    logger.info(`✅ Created new character: ${characterName} for user ${userTag} (${userId})`);

  } catch (error) {
    logger.error("Error creating character", error);
    
    const errorEmbed = ResponseUtil.error(
      "Creation Failed",
      "Failed to create your character. Please try again later."
    );

    await interaction.editReply({
      embeds: [errorEmbed],
      components: [],
    });
  }
}

async function showGameInfo(interaction: any, userId: string, userTag: string) {
  const infoEmbed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle('📖 About MafiaWar')
    .setDescription('A comprehensive text-based criminal empire building game for Discord!')
    .addFields(
      {
        name: '💰 Multi-Tier Money System',
        value: '**Cash:** Fast access, theft vulnerable\n**Bank:** Protected from players, government risk\n**Crypto:** Market volatile, maximum security',
        inline: false,
      },
      {
        name: '🎯 Progression System',
        value: '• 50 levels of criminal progression\n• XP from crimes and activities\n• Unlock new content as you advance\n• Build reputation in the underworld',
        inline: true,
      },
      {
        name: '🔫 Crime System',
        value: '• 9 different criminal activities\n• Strategic risk vs reward\n• Cooldown-based gameplay\n• Real-time success calculations',
        inline: true,
      },
      {
        name: '🏢 Business Empire',
        value: '• Own criminal assets\n• Generate passive income\n• Upgrade security and profits\n• Defend against robberies',
        inline: true,
      },
      {
        name: '👥 Social Features',
        value: '• Form and join gangs\n• Cooperative gameplay\n• Gang wars and territories\n• Shared resources and goals',
        inline: true,
      },
      {
        name: '🛡️ Privacy & Security',
        value: '• All financial data is private\n• Secure ephemeral responses\n• Strategic information protection\n• Anti-spam cooldown systems',
        inline: false,
      }
    )
    .setFooter({ text: 'Ready to start building your criminal empire?' });

  const backRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('back_to_registration')
        .setLabel('⬅️ Back to Registration')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('create_character')
        .setLabel('🎭 Create Character')
        .setStyle(ButtonStyle.Success)
    );

  await interaction.update({
    embeds: [infoEmbed],
    components: [backRow],
  });

  // Handle back button with shorter timeout
  const filter = (i: any) => i.user.id === interaction.user.id;
  const collector = interaction.channel?.createMessageComponentCollector({
    filter,
    componentType: ComponentType.Button,
    time: 120000 // 2 minutes
  });

  if (collector) {
    collector.on('collect', async (i: any) => {
      try {
        if (i.customId === 'back_to_registration') {
          await showRegistrationFlow(i, userTag, userId);
        } else if (i.customId === 'create_character') {
          await showCharacterCreationModal(i, userId, userTag);
        }
      } catch (error) {
        logger.error("Error in game info handler", error);
        
        if (error instanceof Error && error.message?.includes('Unknown interaction')) {
          try {
            await i.followUp({
              content: "⏰ This interaction has expired. Please run `/create-account` again.",
              flags: 64
            });
          } catch (followUpError) {
            logger.error("Failed to send follow-up message", followUpError);
          }
        }
      }
    });
  }
}

async function cancelRegistration(interaction: any) {
  const cancelEmbed = new EmbedBuilder()
    .setColor(0x888888)
    .setTitle('👋 Registration Cancelled')
    .setDescription('No problem! You can create your character anytime by using `/create-account` again.')
    .addFields({
      name: '💡 When you\'re ready',
      value: 'Use `/create-account` to start your criminal journey and build your empire!',
      inline: false,
    })
    .setTimestamp();

  await interaction.update({
    embeds: [cancelEmbed],
    components: [], // Remove all buttons
  });
}

export default createAccountCommand;
