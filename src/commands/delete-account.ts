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

const deleteAccountCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("delete-account")
    .setDescription("⚠️ Permanently delete your account and all game data"),

  async execute(context: CommandContext): Promise<CommandResult> {
    const { interaction, userId, userTag } = context;

    try {
      // Check if user exists
      const previewResult = await DatabaseManager.getUserDeletionPreview(userId);
      
      if (!previewResult.found) {
        const notFoundEmbed = ResponseUtil.info(
          "No Account Found",
          "You don't have a MafiaWar account to delete. Use `/profile` to create one!"
        );
        await ResponseUtil.smartReply(interaction, { embeds: [notFoundEmbed], flags: 64 });
        return { success: true };
      }

      if (previewResult.error) {
        const errorEmbed = ResponseUtil.error(
          "Error",
          "Failed to load your account information. Please try again later."
        );
        await ResponseUtil.smartReply(interaction, { embeds: [errorEmbed], flags: 64 });
        return { success: false, error: previewResult.error };
      }

      // Show deletion preview and warning
      await showDeletionWarning(interaction, previewResult.preview!, userId, userTag);
      return { success: true };

    } catch (error) {
      logger.error("Error in delete-account command", error);

      const errorEmbed = ResponseUtil.error(
        "Deletion Error",
        "Failed to process account deletion request. Please try again later."
      );

      await ResponseUtil.smartReply(interaction, { embeds: [errorEmbed], flags: 64 });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  cooldown: 30,
  category: "account",
  description: "Permanently delete your MafiaWar account and all associated data",
};

async function showDeletionWarning(interaction: any, preview: any, userId: string, userTag: string) {
  const warningEmbed = new EmbedBuilder()
    .setColor(0xff0000) // Red for danger
    .setTitle("⚠️ ACCOUNT DELETION WARNING")
    .setDescription(
      `**${userTag}**, you are about to **PERMANENTLY DELETE** your MafiaWar account!\n\n` +
      "🚨 **THIS ACTION CANNOT BE UNDONE** 🚨\n\n" +
      "**What will be deleted:**"
    )
    .addFields(
      {
        name: "👤 Character Data",
        value: preview.character 
          ? `• **${preview.character.name}** (Level ${preview.character.level})\n• $${preview.character.cashOnHand.toLocaleString()} cash\n• $${preview.character.bankBalance.toLocaleString()} in bank\n• ${preview.character.reputation} reputation`
          : "• No character found",
        inline: false,
      },
      {
        name: "🏢 Assets & Property",
        value: preview.assets.length > 0 
          ? `• ${preview.assets.length} properties\n• Total upgrades: ${preview.assets.reduce((sum: number, asset: any) => sum + asset.upgrades, 0)}\n• Combined value: $${preview.assets.reduce((sum: number, asset: any) => sum + asset.value, 0).toLocaleString()}`
          : "• No assets owned",
        inline: true,
      },
      {
        name: "👥 Gang Involvement",
        value: `• Member of ${preview.gangs.memberships.length} gangs\n• Leader of ${preview.gangs.leadership.length} gangs\n${preview.gangs.leadership.length > 0 ? "• Leadership will be transferred" : ""}`,
        inline: true,
      },
      {
        name: "🎒 Inventory & Items",
        value: preview.inventory.length > 0
          ? `• ${preview.inventory.length} different items\n• Total value: $${preview.inventory.reduce((sum: number, item: any) => sum + (item.value * item.quantity), 0).toLocaleString()}`
          : "• No items in inventory",
        inline: true,
      },
      {
        name: "📊 Game Statistics",
        value: `• ${preview.statistics.totalActionLogs} action logs\n• ${preview.statistics.totalRobberies} robberies\n• ${preview.statistics.totalMissions} missions\n• ${preview.statistics.bankTransactions} bank transactions\n• ${preview.statistics.cryptoTransactions} crypto transactions`,
        inline: true,
      },
      {
        name: "🔄 Gang Leadership Impact",
        value: preview.gangs.leadership.length > 0
          ? preview.gangs.leadership.map((gang: any) => 
              gang.willDelete 
                ? `• **${gang.gangName}** will be DELETED (no other members)`
                : `• **${gang.gangName}** leadership will transfer to another member`
            ).join("\n")
          : "• No gangs will be affected",
        inline: false,
      }
    )
    .addFields({
      name: "⚠️ FINAL WARNING",
      value: 
        "• **ALL** your game progress will be lost forever\n" +
        "• **ALL** your money, assets, and items will be deleted\n" +
        "• **ALL** your statistics and history will be erased\n" +
        "• You will need to start completely over if you rejoin\n" +
        "• Gang leadership will be transferred or gangs deleted\n\n" +
        "**Are you absolutely sure you want to continue?**",
      inline: false,
    })
    .setFooter({ text: "This action is PERMANENT and IRREVERSIBLE!" })
    .setTimestamp();

  const actionRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_deletion')
        .setLabel('🗑️ YES, DELETE EVERYTHING')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('require_verification')
        .setLabel('🔐 I Need to Verify First')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('cancel_deletion')
        .setLabel('❌ Cancel (Keep My Account)')
        .setStyle(ButtonStyle.Primary)
    );

  await ResponseUtil.smartReply(interaction, {
    embeds: [warningEmbed],
    components: [actionRow],
    flags: 64 // Ephemeral
  });

  // Handle button interactions
  const filter = (i: any) => i.user.id === interaction.user.id;
  const collector = interaction.channel?.createMessageComponentCollector({
    filter,
    componentType: ComponentType.Button,
    time: 300000 // 5 minutes
  });

  if (collector) {
    collector.on('collect', async (i: any) => {
      try {
        if (i.customId === 'confirm_deletion') {
          await executeAccountDeletion(i, userId, userTag, preview);
        } else if (i.customId === 'require_verification') {
          await showVerificationModal(i, userId, userTag, preview);
        } else if (i.customId === 'cancel_deletion') {
          await cancelDeletion(i);
        }
      } catch (error) {
        logger.error("Error handling deletion button interaction", error);
      }
    });

    collector.on('end', () => {
      // Disable buttons after timeout
      actionRow.components.forEach(button => button.setDisabled(true));
      interaction.editReply({ components: [actionRow] }).catch(() => {});
    });
  }
}

async function showVerificationModal(interaction: any, userId: string, userTag: string, preview: any) {
  const modal = new ModalBuilder()
    .setCustomId('deletion_verification')
    .setTitle('🔐 Account Deletion Verification');

  const characterNameInput = new TextInputBuilder()
    .setCustomId('character_name_verification')
    .setLabel('Enter your character name to verify')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(preview.character ? `Type: ${preview.character.name}` : 'No character found')
    .setRequired(true)
    .setMinLength(2)
    .setMaxLength(50);

  const confirmationInput = new TextInputBuilder()
    .setCustomId('deletion_confirmation')
    .setLabel('Type "DELETE MY ACCOUNT" to confirm')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Type exactly: DELETE MY ACCOUNT')
    .setRequired(true)
    .setMinLength(17)
    .setMaxLength(17);

  const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(characterNameInput);
  const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(confirmationInput);

  modal.addComponents(firstActionRow, secondActionRow);

  await interaction.showModal(modal);

  // Handle modal submission
  try {
    const submitted = await interaction.awaitModalSubmit({
      time: 300000, // 5 minutes
      filter: (i: any) => i.user.id === interaction.user.id,
    });

    const enteredName = submitted.fields.getTextInputValue('character_name_verification');
    const confirmationText = submitted.fields.getTextInputValue('deletion_confirmation');

    // Verify inputs
    const expectedName = preview.character?.name || '';
    const isNameCorrect = enteredName.toLowerCase() === expectedName.toLowerCase();
    const isConfirmationCorrect = confirmationText === 'DELETE MY ACCOUNT';

    if (!isNameCorrect || !isConfirmationCorrect) {
      const errorEmbed = ResponseUtil.error(
        "Verification Failed",
        !isNameCorrect 
          ? `Character name doesn't match. Expected: "${expectedName}"`
          : "Confirmation text doesn't match. Must be exactly: 'DELETE MY ACCOUNT'"
      );

      await submitted.reply({
        embeds: [errorEmbed],
        flags: 64
      });
      return;
    }

    // Verification successful - proceed with deletion
    await executeAccountDeletion(submitted, userId, userTag, preview);

  } catch (error) {
    logger.error("Modal verification timeout or error", error);
  }
}

async function executeAccountDeletion(interaction: any, userId: string, userTag: string, preview: any) {
  // Show loading message
  const loadingEmbed = new EmbedBuilder()
    .setColor(0xffaa00)
    .setTitle("🔄 Deleting Account...")
    .setDescription("Please wait while we permanently delete your account and all data...")
    .setTimestamp();

  await interaction.update({
    embeds: [loadingEmbed],
    components: [],
  });

  try {
    // Get user ID from database
    const user = await DatabaseManager.getClient().user.findUnique({
      where: { discordId: userId },
      select: { id: true, username: true }
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
    const successEmbed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle("✅ Account Successfully Deleted")
      .setDescription(
        `**${userTag}**, your MafiaWar account has been permanently deleted.\n\n` +
        "**What was deleted:**"
      )
      .addFields(
        {
          name: "📊 Deletion Summary",
          value: 
            `• Character: ${deletionResult.deletedData.character ? '1 deleted' : 'None'}\n` +
            `• Assets: ${deletionResult.deletedData.assets} deleted\n` +
            `• Gang memberships: ${deletionResult.deletedData.gangMemberships} removed\n` +
            `• Gang leadership: ${deletionResult.deletedData.ledGangs} transferred/deleted\n` +
            `• Inventory items: ${deletionResult.deletedData.inventory} deleted\n` +
            `• Action logs: ${deletionResult.deletedData.actionLogs} deleted\n` +
            `• Bank transactions: ${deletionResult.deletedData.bankTransactions} deleted\n` +
            `• Crypto transactions: ${deletionResult.deletedData.cryptoTransactions} deleted`,
          inline: false,
        },
        {
          name: "🔄 If You Change Your Mind",
          value: "• Use `/profile` to create a new character\n• You'll start completely fresh\n• All progress and data is permanently lost",
          inline: false,
        }
      )
      .setFooter({ text: "Thank you for playing MafiaWar!" })
      .setTimestamp();

    await interaction.editReply({
      embeds: [successEmbed]
    });

    // Log the successful deletion
    logger.info(`🗑️ Successfully deleted account for ${userTag} (${userId})`, deletionResult.deletedData);

  } catch (error) {
    logger.error("Error executing account deletion", error);
    
    const errorEmbed = ResponseUtil.error(
      "Deletion Failed",
      "Failed to delete your account. Please contact an administrator or try again later."
    );

    await interaction.editReply({
      embeds: [errorEmbed]
    });
  }
}

async function cancelDeletion(interaction: any) {
  const cancelEmbed = new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle("✅ Account Deletion Cancelled")
    .setDescription("Your account is safe! No data has been deleted.")
    .addFields({
      name: "💡 Your Account",
      value: "• All your data remains intact\n• Continue playing as normal\n• Use `/profile` to view your character",
      inline: false,
    })
    .setFooter({ text: "Welcome back to the criminal underworld!" })
    .setTimestamp();

  await interaction.update({
    embeds: [cancelEmbed],
    components: [],
  });
}

export default deleteAccountCommand;
