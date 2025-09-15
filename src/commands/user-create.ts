import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { BotBranding } from "../config/bot";
import { RegistrationContent } from "../content/registration";
import { Command, CommandContext, CommandResult } from "../types/command";
import DatabaseManager from "../utils/DatabaseManager";
import { ResponseUtil, logger } from "../utils/ResponseUtil";

const createAccountCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("user-create")
    .setDescription(
      `🎭 Create your ${BotBranding.getName()} criminal character and start your empire`
    ),

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
        const content = RegistrationContent.status.alreadyExists;
        const alreadyExistsEmbed = ResponseUtil.info(
          content.title,
          content.getDescription(userTag, BotBranding.getName())
        ).addFields(
          {
            name: content.fields.account.name,
            value: existingUser.character
              ? content.fields.account.getExistingValue(
                  existingUser.character.name,
                  existingUser.character.level
                )
              : content.fields.account.corruptedValue,
            inline: false,
          },
          {
            name: content.fields.commands.name,
            value: content.fields.commands.value,
            inline: false,
          }
        );

        await ResponseUtil.smartReply(interaction, {
          embeds: [alreadyExistsEmbed],
          flags: 64,
        });
        return { success: true };
      }

      // User doesn't exist - show registration flow
      await showRegistrationFlow(interaction, userTag, userId);
      return { success: true };
    } catch (error) {
      logger.error("Error in user-create command", error);

      const errorEmbed = ResponseUtil.error(
        "Account Creation Error",
        "Failed to process account creation request. Please try again later."
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

  cooldown: 3,
  category: "account",
  description: `Create your criminal character and join the ${BotBranding.getName()} underworld`,
};

// Helper function to create welcome embed
function createWelcomeEmbed(userTag: string): EmbedBuilder {
  const content = RegistrationContent.welcome;

  return new EmbedBuilder()
    .setColor(BotBranding.getThemeColor())
    .setTitle(BotBranding.getAccountCreationTitle())
    .setDescription(content.getDescription(userTag))
    .addFields(
      {
        name: content.fields.journey.name,
        value: content.fields.journey.value,
        inline: false,
      },
      {
        name: content.fields.possibilities.name,
        value: content.fields.possibilities.value,
        inline: true,
      },
      {
        name: content.fields.startReign.name,
        value: content.fields.startReign.value,
        inline: true,
      }
    )
    .setFooter({
      text: BotBranding.getFooterText(content.footer),
    })
    .setTimestamp();
}

// Helper function to create action buttons
function createWelcomeButtons(): ActionRowBuilder<ButtonBuilder> {
  const buttons = RegistrationContent.buttons;

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("create_character")
      .setLabel(buttons.claimPower)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("learn_more")
      .setLabel(buttons.learnMore)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("cancel_registration")
      .setLabel(buttons.notNow)
      .setStyle(ButtonStyle.Danger)
  );
}

// Main registration flow
async function showRegistrationFlow(
  interaction: any,
  userTag: string,
  userId: string
) {
  try {
    const welcomeEmbed = createWelcomeEmbed(userTag);
    const actionRow = createWelcomeButtons();

    await ResponseUtil.smartReply(interaction, {
      embeds: [welcomeEmbed],
      components: [actionRow],
      flags: 64,
    });

    // Set up button collector
    const collector = interaction.channel?.createMessageComponentCollector({
      filter: (i: any) => i.user.id === interaction.user.id,
      componentType: ComponentType.Button,
      time: 120000,
    });

    if (!collector) return;

    let isHandled = false;

    collector.on("collect", async (buttonInteraction: any) => {
      // Prevent multiple collections
      if (isHandled) return;
      isHandled = true;
      collector.stop();

      try {
        switch (buttonInteraction.customId) {
          case "create_character":
            await handleCreateCharacter(buttonInteraction, userId, userTag);
            break;
          case "learn_more":
            await handleLearnMore(buttonInteraction, userId, userTag);
            break;
          case "cancel_registration":
            await handleCancelRegistration(buttonInteraction);
            break;
        }
      } catch (error) {
        logger.error("Error handling button in registration flow", error);
        await safeErrorReply(
          buttonInteraction,
          RegistrationContent.errors.general
        );
      }
    });

    collector.on("end", (_collected: any, reason: string) => {
      // Only disable buttons if the collector timed out (not manually stopped)
      if (reason === "time" && !isHandled) {
        const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          ...actionRow.components.map((button) => button.setDisabled(true))
        );
        interaction.editReply({ components: [disabledRow] }).catch(() => {});
      }
    });
  } catch (error) {
    logger.error("Error in showRegistrationFlow", error);
  }
}

// Handle create character button
async function handleCreateCharacter(
  interaction: any,
  userId: string,
  userTag: string
) {
  if (interaction.replied || interaction.deferred) {
    logger.warn("Interaction already handled, cannot show modal");
    return;
  }

  try {
    const content = RegistrationContent.modal;

    const modal = new ModalBuilder()
      .setCustomId("character_creation")
      .setTitle(content.title);

    const nameInput = new TextInputBuilder()
      .setCustomId("character_name")
      .setLabel(content.nameLabel)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(content.namePlaceholder)
      .setRequired(true)
      .setMinLength(2)
      .setMaxLength(30);

    const backgroundInput = new TextInputBuilder()
      .setCustomId("character_background")
      .setLabel(content.backgroundLabel)
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder(content.backgroundPlaceholder)
      .setRequired(false)
      .setMaxLength(500);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(backgroundInput)
    );

    await interaction.showModal(modal);

    // Handle modal submission
    try {
      const submitted = await interaction.awaitModalSubmit({
        time: 120000,
        filter: (i: any) => i.user.id === interaction.user.id,
      });

      const characterName =
        submitted.fields.getTextInputValue("character_name");
      const characterBackground =
        submitted.fields.getTextInputValue("character_background") ||
        content.defaultBackground;

      await showCharacterConfirmation(
        submitted,
        characterName,
        characterBackground,
        userId,
        userTag
      );
    } catch (modalError) {
      logger.error("Modal submission timeout", modalError);
    }
  } catch (error) {
    logger.error("Error showing character creation modal", error);
    if (!isInteractionExpired(error)) {
      await safeErrorReply(interaction, RegistrationContent.errors.modalFailed);
    }
  }
}

// Handle learn more button
async function handleLearnMore(
  interaction: any,
  userId: string,
  userTag: string
) {
  if (interaction.replied || interaction.deferred) {
    logger.warn("Interaction already handled, cannot show game info");
    return;
  }

  try {
    const content = RegistrationContent.gameInfo;
    const buttons = RegistrationContent.buttons;

    const infoEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(content.title)
      .setDescription(content.description)
      .addFields(
        {
          name: content.fields.economy.name,
          value: content.fields.economy.value,
          inline: false,
        },
        {
          name: content.fields.progression.name,
          value: content.fields.progression.value,
          inline: true,
        },
        {
          name: content.fields.operations.name,
          value: content.fields.operations.value,
          inline: true,
        },
        {
          name: content.fields.empire.name,
          value: content.fields.empire.value,
          inline: true,
        },
        {
          name: content.fields.warfare.name,
          value: content.fields.warfare.value,
          inline: true,
        },
        {
          name: content.fields.legacy.name,
          value: content.fields.legacy.value,
          inline: false,
        }
      )
      .setFooter({
        text: BotBranding.getFooterText(content.footer),
      });

    const infoButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("create_character_from_info")
        .setLabel(buttons.claimPower)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("close_info")
        .setLabel(buttons.close)
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({
      embeds: [infoEmbed],
      components: [infoButtons],
    });

    // Set up collector for info screen
    const collector = interaction.channel?.createMessageComponentCollector({
      filter: (i: any) => i.user.id === interaction.user.id,
      componentType: ComponentType.Button,
      time: 120000,
    });

    if (!collector) return;

    let isInfoHandled = false;

    collector.on("collect", async (buttonInteraction: any) => {
      if (isInfoHandled) return;
      isInfoHandled = true;
      collector.stop();

      try {
        if (buttonInteraction.customId === "create_character_from_info") {
          await handleCreateCharacter(buttonInteraction, userId, userTag);
        } else if (buttonInteraction.customId === "close_info") {
          await handleCloseInfo(buttonInteraction);
        }
      } catch (error) {
        logger.error("Error handling button in game info", error);
        await safeErrorReply(
          buttonInteraction,
          RegistrationContent.errors.general
        );
      }
    });

    collector.on("end", (_collected: any, reason: string) => {
      // Only disable buttons if the collector timed out (not manually stopped)
      if (reason === "time" && !isInfoHandled) {
        const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          ...infoButtons.components.map((button) => button.setDisabled(true))
        );
        interaction.editReply({ components: [disabledRow] }).catch(() => {});
      }
    });
  } catch (error) {
    logger.error("Error showing game info", error);
    if (!isInteractionExpired(error)) {
      await safeErrorReply(interaction, RegistrationContent.errors.infoFailed);
    }
  }
}

// Handle close info button
async function handleCloseInfo(interaction: any) {
  try {
    const content = RegistrationContent.status.infoClosed;

    const closedEmbed = new EmbedBuilder()
      .setColor(0x888888)
      .setTitle(content.title)
      .setDescription(content.description)
      .setTimestamp();

    await interaction.update({
      embeds: [closedEmbed],
      components: [],
    });
  } catch (error) {
    logger.error("Error closing info", error);
  }
}

// Handle cancel registration button
async function handleCancelRegistration(interaction: any) {
  try {
    const content = RegistrationContent.status.cancelled;

    const cancelEmbed = new EmbedBuilder()
      .setColor(0x888888)
      .setTitle(content.title)
      .setDescription(content.description)
      .addFields({
        name: content.field.name,
        value: content.field.value,
        inline: false,
      })
      .setTimestamp();

    await interaction.update({
      embeds: [cancelEmbed],
      components: [],
    });
  } catch (error) {
    logger.error("Error cancelling registration", error);
  }
}

// Show character confirmation
async function showCharacterConfirmation(
  interaction: any,
  characterName: string,
  background: string,
  userId: string,
  userTag: string
) {
  try {
    const content = RegistrationContent.confirmation;
    const buttons = RegistrationContent.buttons;

    const confirmEmbed = new EmbedBuilder()
      .setColor(BotBranding.getThemeColor())
      .setTitle(content.title)
      .setDescription(content.getDescription(characterName, background))
      .addFields(
        {
          name: content.fields.resources.name,
          value: content.fields.resources.value,
          inline: true,
        },
        {
          name: content.fields.stats.name,
          value: content.fields.stats.value,
          inline: true,
        },
        {
          name: content.fields.level.name,
          value: content.fields.level.value,
          inline: true,
        }
      )
      .setFooter({
        text: BotBranding.getFooterText(content.footer),
      });

    const confirmButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm_character")
        .setLabel(buttons.confirmCreate)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("modify_character")
        .setLabel(buttons.modifyDetails)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("cancel_character")
        .setLabel(buttons.cancel)
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({
      embeds: [confirmEmbed],
      components: [confirmButtons],
      flags: 64,
    });

    // Set up collector for confirmation
    const collector = interaction.channel?.createMessageComponentCollector({
      filter: (i: any) => i.user.id === interaction.user.id,
      componentType: ComponentType.Button,
      time: 120000,
    });

    if (!collector) return;

    let isConfirmHandled = false;

    collector.on("collect", async (buttonInteraction: any) => {
      if (isConfirmHandled) return;
      isConfirmHandled = true;
      collector.stop();

      try {
        switch (buttonInteraction.customId) {
          case "confirm_character":
            await finalizeCharacterCreation(
              buttonInteraction,
              characterName,
              background,
              userId,
              userTag
            );
            break;
          case "modify_character":
            await handleCreateCharacter(buttonInteraction, userId, userTag);
            break;
          case "cancel_character":
            await handleCancelRegistration(buttonInteraction);
            break;
        }
      } catch (error) {
        logger.error("Error handling confirmation button", error);
        await safeErrorReply(
          buttonInteraction,
          RegistrationContent.errors.general
        );
      }
    });

    collector.on("end", (_collected: any, reason: string) => {
      // Only disable buttons if the collector timed out (not manually stopped)
      if (reason === "time" && !isConfirmHandled) {
        const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          ...confirmButtons.components.map((button) => button.setDisabled(true))
        );
        interaction.editReply({ components: [disabledRow] }).catch(() => {});
      }
    });
  } catch (error) {
    logger.error("Error showing character confirmation", error);
  }
}

// Finalize character creation
async function finalizeCharacterCreation(
  interaction: any,
  characterName: string,
  background: string,
  userId: string,
  userTag: string
) {
  try {
    // Show loading message
    const loadingContent = RegistrationContent.status.loading;
    const loadingEmbed = new EmbedBuilder()
      .setColor(0xffaa00)
      .setTitle(loadingContent.title)
      .setDescription(loadingContent.description)
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
            cashOnHand: 1000,
            bankBalance: 0,
            cryptoWallet: "{}",
            money: 0,
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

    // Show success message
    const successContent = RegistrationContent.success;
    const successEmbed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle(successContent.title)
      .setDescription(successContent.getDescription(characterName))
      .addFields(
        {
          name: successContent.fields.firstMoves.name,
          value: successContent.fields.firstMoves.value,
          inline: false,
        },
        {
          name: successContent.fields.pathToPower.name,
          value: successContent.fields.pathToPower.value,
          inline: false,
        }
      )
      .setFooter({ text: successContent.footer })
      .setTimestamp();

    // Update the confirmation message with private success info (ephemeral)
    await interaction.editReply({
      embeds: [successEmbed],
      components: [],
    });

    // Send public announcement to the channel
    try {
      const announcements = RegistrationContent.publicAnnouncements;
      const randomAnnouncement =
        announcements[Math.floor(Math.random() * announcements.length)];

      const publicEmbed = new EmbedBuilder()
        .setColor(BotBranding.getThemeColor())
        .setTitle(randomAnnouncement.title)
        .setDescription(randomAnnouncement.getDescription(characterName))
        .setFooter({ text: randomAnnouncement.footer })
        .setTimestamp();

      // Send public message in the channel
      await interaction.channel?.send({
        embeds: [publicEmbed],
      });
    } catch (publicError) {
      logger.error("Failed to send public announcement", publicError);
      // Don't fail the character creation if public announcement fails
    }

    // Log the creation
    await DatabaseManager.logAction(user.id, "character_creation", "success", {
      characterName,
      background,
      commandUsed: "user-create",
    });

    logger.info(
      `✅ Created new character: ${characterName} for user ${userTag} (${userId})`
    );
  } catch (error) {
    logger.error("Error creating character", error);

    const errorEmbed = ResponseUtil.error(
      "Creation Failed",
      RegistrationContent.errors.creationFailed
    );

    await interaction.editReply({
      embeds: [errorEmbed],
      components: [],
    });
  }
}

// Utility functions
function isInteractionExpired(error: any): boolean {
  return (
    error instanceof Error &&
    (error.message?.includes("Unknown interaction") ||
      error.message?.includes("already been acknowledged"))
  );
}

async function safeErrorReply(interaction: any, message: string) {
  try {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: message,
        flags: 64,
      });
    }
  } catch (error) {
    logger.error("Failed to send error reply", error);
  }
}

export default createAccountCommand;
