import { BotBranding } from "../config/bot";

export const DeletionContent = {
  // No account found
  noAccount: {
    title: "No Account Found",
    getDescription: (botName: string) =>
      `You don't have a ${botName} account to delete. Use \`/user-create\` to create one!`,
  },

  // Error messages
  errors: {
    loadFailed:
      "Failed to load your account information. Please try again later.",
    deletionFailed:
      "Failed to delete your account. Please contact an administrator or try again later.",
    processingFailed:
      "Failed to process account deletion request. Please try again later.",
    verificationFailed: {
      name: (expectedName: string) =>
        `Character name doesn't match. Expected: "${expectedName}"`,
      confirmation:
        "Confirmation text doesn't match. Must be exactly: 'DELETE MY ACCOUNT'",
    },
  },

  // Main deletion warning
  warning: {
    title: "⚠️ ACCOUNT DELETION WARNING",
    getDescription: (userTag: string, botName: string) =>
      `**${userTag}**, you are about to **PERMANENTLY DELETE** your ${botName} account!\n\n` +
      "🚨 **THIS ACTION CANNOT BE UNDONE** 🚨\n\n" +
      "**What will be deleted:**",

    fields: {
      character: {
        name: "👤 Character Data",
        getValue: (character: any) =>
          character
            ? `• **${character.name}** (Level ${
                character.level
              })\n• ${BotBranding.formatCurrency(
                character.cashOnHand
              )} cash\n• ${BotBranding.formatCurrency(
                character.bankBalance
              )} in bank\n• ${character.reputation} reputation`
            : "• No character found",
      },

      assets: {
        name: "🏢 Assets & Property",
        getValue: (assets: any[]) =>
          assets.length > 0
            ? `• ${assets.length} properties\n• Total upgrades: ${assets.reduce(
                (sum: number, asset: any) => sum + asset.upgrades,
                0
              )}\n• Combined value: ${BotBranding.formatCurrency(
                assets.reduce((sum: number, asset: any) => sum + asset.value, 0)
              )}`
            : "• No assets owned",
      },

      inventory: {
        name: "🎒 Inventory & Items",
        getValue: (inventory: any[]) =>
          inventory.length > 0
            ? `• ${
                inventory.length
              } different items\n• Total value: ${BotBranding.formatCurrency(
                inventory.reduce(
                  (sum: number, item: any) => sum + item.value * item.quantity,
                  0
                )
              )}`
            : "• No items in inventory",
      },

      finalWarning: {
        name: "⚠️ FINAL WARNING",
        value:
          "• **ALL** your game progress will be lost forever\n" +
          "• **ALL** your money, assets, and items will be deleted\n" +
          "• **ALL** your statistics and history will be erased\n" +
          "• You will need to start completely over if you rejoin\n\n" +
          "**Are you absolutely sure you want to continue?**",
      },
    },

    footer: "This action is PERMANENT and IRREVERSIBLE!",
  },

  // Button labels
  buttons: {
    confirmDeletion: "🗑️ YES, DELETE EVERYTHING",
    cancelDeletion: "❌ Cancel (Keep My Account)",
  },

  // Verification modal
  verification: {
    modal: {
      title: "🔐 Account Deletion Verification",
      nameLabel: "Enter your character name to verify",
      getNamePlaceholder: (characterName: string | null) =>
        characterName ? `Type: ${characterName}` : "No character found",
      confirmationLabel: 'Type "DELETE MY ACCOUNT" to confirm',
      confirmationPlaceholder: "Type exactly: DELETE MY ACCOUNT",
    },
  },

  // Status messages
  status: {
    loading: {
      title: "🔄 Deleting Account...",
      description:
        "Please wait while we permanently delete your account and all data...",
    },

    success: {
      title: "✅ Account Successfully Deleted",
      getDescription: (userTag: string, botName: string) =>
        `**${userTag}**, your ${botName} account has been permanently deleted.`,

      fields: {
        comeback: {
          name: "🔄 If You Change Your Mind",
          value:
            "• Use `/user-create` to create a new character\n• All progress and data is permanently lost\n• You'll start completely fresh",
        },
      },

      getFooter: (botName: string) => `Thank you for playing ${botName}!`,
    },
  },
};
