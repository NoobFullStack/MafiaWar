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
import { DeletionContent } from "../content/deletion";
import { Command, CommandContext, CommandResult } from "../types/command";
import DatabaseManager from "../utils/DatabaseManager";
import { ResponseUtil, logger } from "../utils/ResponseUtil";

const deleteAccountCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("delete-account")
    .setDescription("⚠️ Permanently delete your account and all game data"),

  async execute(context: CommandContext): Promise<CommandResult> {
    const { interaction, userId, userTag } = context;

    try {
      // Check if user exists
      const previewResult = await DatabaseManager.getUserDeletionPreview(
        userId
      );

      if (!previewResult.found) {
        const content = DeletionContent.noAccount;
        const notFoundEmbed = ResponseUtil.info(
          content.title,
          content.getDescription(BotBranding.getName())
        );
        await ResponseUtil.smartReply(interaction, {
          embeds: [notFoundEmbed],
          flags: 64,
        });
        return { success: true };
      }

      if (previewResult.error) {
        const errorEmbed = ResponseUtil.error(
          "Error",
          DeletionContent.errors.loadFailed
        );
        await ResponseUtil.smartReply(interaction, {
          embeds: [errorEmbed],
          flags: 64,
        });
        return { success: false, error: previewResult.error };
      }

      // Show deletion preview and warning
      await showDeletionWarning(
        interaction,
        previewResult.preview!,
        userId,
        userTag
      );
      return { success: true };
    } catch (error) {
      logger.error("Error in delete-account command", error);

      const errorEmbed = ResponseUtil.error(
        "Deletion Error",
        DeletionContent.errors.processingFailed
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
  category: "account",
  description: `Permanently delete your ${BotBranding.getName()} account and all associated data`,
};

async function showDeletionWarning(
  interaction: any,
  preview: any,
  userId: string,
  userTag: string
) {
  const content = DeletionContent.warning;

  const warningEmbed = new EmbedBuilder()
    .setColor(0xff0000) // Red for danger
    .setTitle(content.title)
    .setDescription(content.getDescription(userTag, BotBranding.getName()))
    .addFields(
      {
        name: content.fields.character.name,
        value: content.fields.character.getValue(preview.character),
        inline: false,
      },
      {
        name: content.fields.assets.name,
        value: content.fields.assets.getValue(preview.assets),
        inline: true,
      },
      {
        name: content.fields.inventory.name,
        value: content.fields.inventory.getValue(preview.inventory),
        inline: true,
      },
      {
        name: content.fields.finalWarning.name,
        value: content.fields.finalWarning.value,
        inline: false,
      }
    )
    .setFooter({ text: content.footer })
    .setTimestamp();

  const buttons = DeletionContent.buttons;
  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("confirm_deletion")
      .setLabel(buttons.confirmDeletion)
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("cancel_deletion")
      .setLabel(buttons.cancelDeletion)
      .setStyle(ButtonStyle.Primary)
  );

  await ResponseUtil.smartReply(interaction, {
    embeds: [warningEmbed],
    components: [actionRow],
    flags: 64, // Ephemeral
  });

  // Handle button interactions
  const filter = (i: any) => i.user.id === interaction.user.id;
  const collector = interaction.channel?.createMessageComponentCollector({
    filter,
    componentType: ComponentType.Button,
    time: 300000, // 5 minutes
  });

  if (collector) {
    collector.on("collect", async (i: any) => {
      try {
        if (i.customId === "confirm_deletion") {
          await executeAccountDeletion(i, userId, userTag, preview);
        } else if (i.customId === "cancel_deletion") {
          // Simply dismiss the interaction without showing any message
          collector.stop();
          await i.deferUpdate();
        }
      } catch (error) {
        logger.error("Error handling deletion button interaction", error);
      }
    });

    collector.on("end", () => {
      // Disable buttons after timeout
      actionRow.components.forEach((button) => button.setDisabled(true));
      interaction.editReply({ components: [actionRow] }).catch(() => {});
    });
  }
}

async function showVerificationModal(
  interaction: any,
  userId: string,
  userTag: string,
  preview: any
) {
  const content = DeletionContent.verification.modal;

  const modal = new ModalBuilder()
    .setCustomId("deletion_verification")
    .setTitle(content.title);

  const characterNameInput = new TextInputBuilder()
    .setCustomId("character_name_verification")
    .setLabel(content.nameLabel)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(content.getNamePlaceholder(preview.character?.name || null))
    .setRequired(true)
    .setMinLength(2)
    .setMaxLength(50);

  const confirmationInput = new TextInputBuilder()
    .setCustomId("deletion_confirmation")
    .setLabel(content.confirmationLabel)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(content.confirmationPlaceholder)
    .setRequired(true)
    .setMinLength(17)
    .setMaxLength(17);

  const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    characterNameInput
  );
  const secondActionRow =
    new ActionRowBuilder<TextInputBuilder>().addComponents(confirmationInput);

  modal.addComponents(firstActionRow, secondActionRow);

  await interaction.showModal(modal);

  // Handle modal submission
  try {
    const submitted = await interaction.awaitModalSubmit({
      time: 300000, // 5 minutes
      filter: (i: any) => i.user.id === interaction.user.id,
    });

    const enteredName = submitted.fields.getTextInputValue(
      "character_name_verification"
    );
    const confirmationText = submitted.fields.getTextInputValue(
      "deletion_confirmation"
    );

    // Verify inputs
    const expectedName = preview.character?.name || "";
    const isNameCorrect =
      enteredName.toLowerCase() === expectedName.toLowerCase();
    const isConfirmationCorrect = confirmationText === "DELETE MY ACCOUNT";

    if (!isNameCorrect || !isConfirmationCorrect) {
      const errorContent = DeletionContent.errors.verificationFailed;
      const errorEmbed = ResponseUtil.error(
        "Verification Failed",
        !isNameCorrect
          ? errorContent.name(expectedName)
          : errorContent.confirmation
      );

      await submitted.reply({
        embeds: [errorEmbed],
        flags: 64,
      });
      return;
    }

    // Verification successful - proceed with deletion
    await executeAccountDeletion(submitted, userId, userTag, preview);
  } catch (error) {
    logger.error("Modal verification timeout or error", error);
  }
}

async function executeAccountDeletion(
  interaction: any,
  userId: string,
  userTag: string,
  preview: any
) {
  // Show loading message
  const loadingContent = DeletionContent.status.loading;
  const loadingEmbed = new EmbedBuilder()
    .setColor(0xffaa00)
    .setTitle(loadingContent.title)
    .setDescription(loadingContent.description)
    .setTimestamp();

  await interaction.update({
    embeds: [loadingEmbed],
    components: [],
  });

  try {
    // Get user ID from database
    const user = await DatabaseManager.getClient().user.findUnique({
      where: { discordId: userId },
      select: { id: true, username: true },
    });

    if (!user) {
      throw new Error("User not found in database");
    }

    // Execute the deletion
    const deletionResult = await DatabaseManager.deleteUser(user.id);

    if (!deletionResult.success) {
      throw new Error(deletionResult.error || "Unknown deletion error");
    }

    // Success message
    const successContent = DeletionContent.status.success;
    const successEmbed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle(successContent.title)
      .setDescription(
        successContent.getDescription(userTag, BotBranding.getName())
      )
      .addFields({
        name: successContent.fields.comeback.name,
        value: successContent.fields.comeback.value,
        inline: false,
      })
      .setFooter({ text: successContent.getFooter(BotBranding.getName()) })
      .setTimestamp();

    await interaction.editReply({
      embeds: [successEmbed],
    });

    // Log the successful deletion
    logger.info(
      `🗑️ Successfully deleted account for ${userTag} (${userId})`,
      deletionResult.deletedData
    );
  } catch (error) {
    logger.error("Error executing account deletion", error);

    const errorEmbed = ResponseUtil.error(
      "Deletion Failed",
      DeletionContent.errors.deletionFailed
    );

    await interaction.editReply({
      embeds: [errorEmbed],
    });
  }
}

export default deleteAccountCommand;
