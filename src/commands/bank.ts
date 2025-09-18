import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  SlashCommandBuilder,
} from "discord.js";
import MoneyServiceV2 from "../services/MoneyServiceV2";
import JailService from "../services/JailService";
import { Command, CommandContext, CommandResult } from "../types/command";
import { ResponseUtil, logger } from "../utils/ResponseUtil";
import DatabaseManager from "../utils/DatabaseManager";
import { BotBranding } from "../config/bot";

const bankCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("bank")
    .setDescription("Manage your bank account")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("deposit")
        .setDescription("Deposit cash into your bank account")
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("Amount to deposit")
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("withdraw")
        .setDescription("Withdraw money from your bank account")
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("Amount to withdraw")
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("info")
        .setDescription(
          "View your bank account information and upgrade options"
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("upgrade")
        .setDescription("Upgrade your bank account tier for better benefits")
    ),

  async execute(context: CommandContext): Promise<CommandResult> {
    const { interaction, userId, userTag } = context;
    const subcommand = interaction.options.getSubcommand();

    try {
      // Check if user has an account
      const user = await DatabaseManager.getUserForAuth(userId);
      if (!user) {
        const noAccountEmbed = ResponseUtil.noAccount(userTag);
        await ResponseUtil.smartReply(interaction, { embeds: [noAccountEmbed], flags: 64 });
        return { success: false, error: "User not registered" };
      }

      // Check if player is in jail (blocks banking activities)
      const jailCheck = await JailService.checkJailBlocking(userId, "banking");
      if (jailCheck.blocked) {
        const embed = ResponseUtil.error("🚔 Banking Blocked", jailCheck.reason || "You can't access banking services while in jail!");
        await ResponseUtil.smartReply(interaction, { embeds: [embed], flags: 64 });
        return { success: false, error: "Player is in jail" };
      }

      const moneyService = MoneyServiceV2.getInstance();

      switch (subcommand) {
        case "deposit": {
          const amount = interaction.options.getInteger("amount", true);

          // Get user balance to check if they have enough cash
          const balance = await moneyService.getUserBalance(userId);

          if (!balance) {
            const embed = ResponseUtil.error(
              "Character Not Found",
              "You need to create a character first! Use `/profile` to get started."
            );
            await ResponseUtil.smartReply(interaction, { embeds: [embed], flags: 64 });
            return { success: false, error: "No character" };
          }

          if (balance.cashOnHand < amount) {
            // Calculate what they would get if they deposited all their cash
            const availableCash = balance.cashOnHand;
            const bankTier = moneyService.getUserBankTier(1); // TODO: Get actual bank tier from user
            const fee = Math.floor(
              availableCash * bankTier.benefits.depositFee
            );
            const netDeposit = availableCash - fee;

            const embed = ResponseUtil.error(
              "Insufficient Cash",
              `You need ${BotBranding.formatCurrency(amount)} but only have ${BotBranding.formatCurrency(availableCash)} cash.`
            );

            if (availableCash > 0) {
              embed.addFields({
                name: "💡 Deposit All Cash Instead?",
                value: `**Your Cash:** ${BotBranding.formatCurrency(availableCash)}\n**Deposit Fee:** ${BotBranding.formatCurrency(fee)} (${(
                  bankTier.benefits.depositFee * 100
                ).toFixed(
                  1
                )}%)\n**You'd Get in Bank:** ${BotBranding.formatCurrency(netDeposit)}`,
                inline: false,
              });

              // Create buttons for user choice
              const confirmButton = new ButtonBuilder()
                .setCustomId(`bank_deposit_max_${userId}`)
                .setLabel(`✅ Deposit All (${BotBranding.formatCurrency(availableCash)})`)
                .setStyle(ButtonStyle.Success);

              const cancelButton = new ButtonBuilder()
                .setCustomId(`bank_deposit_cancel_${userId}`)
                .setLabel("❌ Cancel")
                .setStyle(ButtonStyle.Secondary);

              const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                confirmButton,
                cancelButton
              );

              await ResponseUtil.smartReply(interaction, {
                embeds: [embed],
                components: [row],
                flags: 64,
              });

              // Get the message for button interactions
              const response = await interaction.fetchReply();

              // Handle button interactions
              try {
                const buttonInteraction = await response.awaitMessageComponent({
                  componentType: ComponentType.Button,
                  time: 30000, // 30 seconds timeout
                  filter: (i: any) => i.user.id === userId,
                });

                if (
                  buttonInteraction.customId === `bank_deposit_max_${userId}`
                ) {
                  // Execute max deposit
                  await buttonInteraction.deferUpdate();

                  const result = await moneyService.transferMoney(
                    userId,
                    availableCash,
                    "cash",
                    "bank"
                  );

                  if (result.success) {
                    const successEmbed = ResponseUtil.success(
                      "✅ Maximum Deposit Successful",
                      "Successfully deposited all your available cash!"
                    );

                    if (result.newBalance) {
                      successEmbed.addFields(
                        {
                          name: "💰 Transaction Details",
                          value: `**Deposited:** ${BotBranding.formatCurrency(availableCash)}\n**Fee:** ${BotBranding.formatCurrency(fee)} (${(
                            bankTier.benefits.depositFee * 100
                          ).toFixed(
                            1
                          )}%)\n**Added to Bank:** ${BotBranding.formatCurrency(netDeposit)}`,
                          inline: false,
                        },
                        {
                          name: "Updated Balance",
                          value: `💵 Cash: ${BotBranding.formatCurrency(result.newBalance.cashOnHand)}\n🏦 Bank: ${BotBranding.formatCurrency(result.newBalance.bankBalance)}`,
                          inline: false,
                        }
                      );
                    }

                    successEmbed.setFooter({
                      text: "💡 Your cash is now safely stored in the bank • Use /bank withdraw to access it",
                    });

                    await buttonInteraction.editReply({
                      embeds: [successEmbed],
                      components: [],
                    });
                    return { success: true };
                  } else {
                    const errorEmbed = ResponseUtil.error(
                      "Deposit Failed",
                      result.message
                    );
                    await buttonInteraction.editReply({
                      embeds: [errorEmbed],
                      components: [],
                    });
                    return { success: false, error: result.error };
                  }
                } else if (
                  buttonInteraction.customId === `bank_deposit_cancel_${userId}`
                ) {
                  // Cancel operation
                  await buttonInteraction.deferUpdate();

                  const cancelEmbed = ResponseUtil.info(
                    "❌ Deposit Cancelled",
                    "Your deposit has been cancelled. No changes were made to your accounts."
                  );

                  cancelEmbed.setFooter({
                    text: "💡 Use /bank deposit with a smaller amount or earn more cash with /crime",
                  });

                  await buttonInteraction.editReply({
                    embeds: [cancelEmbed],
                    components: [],
                  });
                  return { success: false, error: "User cancelled" };
                }
              } catch (error) {
                // Timeout or other error - clean up the message
                const timeoutEmbed = ResponseUtil.error(
                  "⏰ Request Timeout",
                  "The deposit request has timed out. Please try again if you still want to make a deposit."
                );

                try {
                  await interaction.editReply({
                    embeds: [timeoutEmbed],
                    components: [],
                  });
                } catch (editError) {
                  logger.warn(
                    "Could not edit interaction after timeout:",
                    editError
                  );
                }

                return { success: false, error: "Timeout" };
              }
            } else {
              embed.addFields({
                name: "💡 Need Cash First",
                value: `• Use \`/crime\` to earn money\n• You need cash to deposit into your bank\n• Check \`/wallet\` to see your current balance`,
                inline: false,
              });

              await ResponseUtil.smartReply(interaction, { embeds: [embed], flags: 64 });
            }

            return { success: false, error: "Insufficient cash" };
          }

          // Proceed with normal deposit if they have enough cash
          const result = await moneyService.transferMoney(
            userId,
            amount,
            "cash",
            "bank"
          );

          let embed;
          if (result.success) {
            embed = ResponseUtil.success(
              "💰 Deposit Successful",
              result.message
            );

            if (result.newBalance) {
              embed.addFields({
                name: "Updated Balance",
                value: `💵 Cash: ${BotBranding.formatCurrency(result.newBalance.cashOnHand)}\n🏦 Bank: ${BotBranding.formatCurrency(result.newBalance.bankBalance)}`,
                inline: false,
              });
            }
          } else {
            embed = ResponseUtil.error("Deposit Failed", result.message);
          }

          await ResponseUtil.smartReply(interaction, { embeds: [embed], flags: 64 });
          return { success: result.success };
        }

        case "withdraw": {
          const amount = interaction.options.getInteger("amount", true);

          // Get user balance to check available bank funds
          const balance = await moneyService.getUserBalance(userId);

          if (!balance) {
            const embed = ResponseUtil.error(
              "Character Not Found",
              "You need to create a character first! Use `/profile` to get started."
            );
            await ResponseUtil.smartReply(interaction, { embeds: [embed], flags: 64 });
            return { success: false, error: "No character" };
          }

          const bankTier = moneyService.getUserBankTier(1); // TODO: Get actual bank tier from user

          // Calculate maximum withdrawable amount (considering fees)
          const maxWithdrawable = Math.floor(
            balance.bankBalance / (1 + bankTier.benefits.withdrawalFee)
          );

          if (amount > maxWithdrawable || balance.bankBalance < amount) {
            const embed = ResponseUtil.error(
              "Insufficient Bank Funds",
              amount > maxWithdrawable
                ? `You need ${BotBranding.formatCurrency(amount)} but can only withdraw ${BotBranding.formatCurrency(maxWithdrawable)} (after fees).`
                : `You need ${BotBranding.formatCurrency(amount)} but only have ${BotBranding.formatCurrency(balance.bankBalance)} in bank.`
            );

            if (maxWithdrawable > 0) {
              const fee = Math.floor(
                maxWithdrawable * bankTier.benefits.withdrawalFee
              );
              const totalCost = maxWithdrawable + fee;

              embed.addFields({
                name: "💡 Withdraw Maximum Instead?",
                value: `**Bank Balance:** ${BotBranding.formatCurrency(balance.bankBalance)}\n**Max Withdrawable:** ${BotBranding.formatCurrency(maxWithdrawable)}\n**Withdrawal Fee:** ${BotBranding.formatCurrency(fee)} (${(
                  bankTier.benefits.withdrawalFee * 100
                ).toFixed(
                  1
                )}%)\n**Total Cost:** ${BotBranding.formatCurrency(totalCost)}\n**You'd Receive:** ${BotBranding.formatCurrency(maxWithdrawable)}`,
                inline: false,
              });

              // Create buttons for user choice
              const confirmButton = new ButtonBuilder()
                .setCustomId(`bank_withdraw_max_${userId}`)
                .setLabel(
                  `✅ Withdraw Max (${BotBranding.formatCurrency(maxWithdrawable)})`
                )
                .setStyle(ButtonStyle.Success);

              const cancelButton = new ButtonBuilder()
                .setCustomId(`bank_withdraw_cancel_${userId}`)
                .setLabel("❌ Cancel")
                .setStyle(ButtonStyle.Secondary);

              const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                confirmButton,
                cancelButton
              );

              await ResponseUtil.smartReply(interaction, {
                embeds: [embed],
                components: [row],
                flags: 64,
              });

              // Get the message for button interactions
              const response = await interaction.fetchReply();

              // Handle button interactions
              try {
                const buttonInteraction = await response.awaitMessageComponent({
                  componentType: ComponentType.Button,
                  time: 30000, // 30 seconds timeout
                  filter: (i: any) => i.user.id === userId,
                });

                if (
                  buttonInteraction.customId === `bank_withdraw_max_${userId}`
                ) {
                  // Execute max withdrawal
                  await buttonInteraction.deferUpdate();

                  const result = await moneyService.transferMoney(
                    userId,
                    maxWithdrawable,
                    "bank",
                    "cash"
                  );

                  if (result.success) {
                    const successEmbed = ResponseUtil.success(
                      "✅ Maximum Withdrawal Successful",
                      "Successfully withdrew all available funds from your bank!"
                    );

                    if (result.newBalance) {
                      successEmbed.addFields(
                        {
                          name: "💰 Transaction Details",
                          value: `**Withdrawn:** ${BotBranding.formatCurrency(maxWithdrawable)}\n**Fee:** ${BotBranding.formatCurrency(fee)} (${(
                            bankTier.benefits.withdrawalFee * 100
                          ).toFixed(
                            1
                          )}%)\n**Total Deducted:** ${BotBranding.formatCurrency(totalCost)}`,
                          inline: false,
                        },
                        {
                          name: "Updated Balance",
                          value: `💵 Cash: ${BotBranding.formatCurrency(result.newBalance.cashOnHand)}\n🏦 Bank: ${BotBranding.formatCurrency(result.newBalance.bankBalance)}`,
                          inline: false,
                        }
                      );
                    }

                    successEmbed.setFooter({
                      text: "💡 Cash is now available for purchases • Consider daily withdrawal limits",
                    });

                    await buttonInteraction.editReply({
                      embeds: [successEmbed],
                      components: [],
                    });
                    return { success: true };
                  } else {
                    const errorEmbed = ResponseUtil.error(
                      "Withdrawal Failed",
                      result.message
                    );
                    await buttonInteraction.editReply({
                      embeds: [errorEmbed],
                      components: [],
                    });
                    return { success: false, error: result.error };
                  }
                } else if (
                  buttonInteraction.customId ===
                  `bank_withdraw_cancel_${userId}`
                ) {
                  // Cancel operation
                  await buttonInteraction.deferUpdate();

                  const cancelEmbed = ResponseUtil.info(
                    "❌ Withdrawal Cancelled",
                    "Your withdrawal has been cancelled. No changes were made to your accounts."
                  );

                  cancelEmbed.setFooter({
                    text: "💡 Use /bank withdraw with a smaller amount or check /bank info for limits",
                  });

                  await buttonInteraction.editReply({
                    embeds: [cancelEmbed],
                    components: [],
                  });
                  return { success: false, error: "User cancelled" };
                }
              } catch (error) {
                // Timeout or other error - clean up the message
                const timeoutEmbed = ResponseUtil.error(
                  "⏰ Request Timeout",
                  "The withdrawal request has timed out. Please try again if you still want to make a withdrawal."
                );

                try {
                  await interaction.editReply({
                    embeds: [timeoutEmbed],
                    components: [],
                  });
                } catch (editError) {
                  logger.warn(
                    "Could not edit interaction after timeout:",
                    editError
                  );
                }

                return { success: false, error: "Timeout" };
              }
            } else {
              embed.addFields({
                name: "💡 No Funds Available",
                value: `• Use \`/bank deposit\` to add money to your bank\n• Your bank account is currently empty\n• Check \`/wallet\` to see your cash balance`,
                inline: false,
              });

              await ResponseUtil.smartReply(interaction, { embeds: [embed], flags: 64 });
            }

            return { success: false, error: "Insufficient bank funds" };
          }

          // Proceed with normal withdrawal if they have enough funds
          const result = await moneyService.transferMoney(
            userId,
            amount,
            "bank",
            "cash"
          );

          let embed;
          if (result.success) {
            embed = ResponseUtil.success(
              "💸 Withdrawal Successful",
              result.message
            );

            if (result.newBalance) {
              embed.addFields({
                name: "Updated Balance",
                value: `💵 Cash: ${BotBranding.formatCurrency(result.newBalance.cashOnHand)}\n🏦 Bank: ${BotBranding.formatCurrency(result.newBalance.bankBalance)}`,
                inline: false,
              });
            }
          } else {
            embed = ResponseUtil.warning("Withdrawal Failed", result.message);
          }

          await ResponseUtil.smartReply(interaction, { embeds: [embed], flags: 64 });
          return { success: result.success };
        }

        case "info": {
          const balance = await moneyService.getUserBalance(userId);

          if (!balance) {
            const embed = ResponseUtil.error(
              "Character Not Found",
              "You need to create a character first! Use `/profile` to get started."
            );
            await ResponseUtil.smartReply(interaction, { embeds: [embed], flags: 64 });
            return { success: false, error: "No character" };
          }

          // Get user's current bank tier
          // For now, assume level 1 bank - this should be from database
          const bankTier = moneyService.getUserBankTier(1);

          const embed = ResponseUtil.info(
            "🏦 Bank Account Information",
            `**${bankTier.name}**\n${
              balance.bankBalance > 0
                ? `Current Balance: ${BotBranding.formatCurrency(balance.bankBalance)}`
                : "No current balance"
            }`
          );

          embed.addFields({
            name: "💰 Benefits",
            value: `• Daily Withdrawal Limit: ${BotBranding.formatCurrency(bankTier.benefits.withdrawalLimit)}\n• Interest Rate: ${(
              bankTier.benefits.interestRate * 100
            ).toFixed(2)}% daily\n• Deposit Fee: ${(
              bankTier.benefits.depositFee * 100
            ).toFixed(2)}%\n• Withdrawal Fee: ${(
              bankTier.benefits.withdrawalFee * 100
            ).toFixed(1)}%\n• Government Protection: ${(
              bankTier.benefits.protectionLevel * 100
            ).toFixed(0)}%`,
            inline: false,
          });

          // Add helpful fee calculator section
          const maxWithdrawable = Math.floor(
            balance.bankBalance / (1 + bankTier.benefits.withdrawalFee)
          );
          const maxDepositFromCash = balance.cashOnHand;
          const depositAfterFee = (amount: number) =>
            Math.floor(amount * (1 - bankTier.benefits.depositFee));

          embed.addFields({
            name: "💡 Quick Reference",
            value: `**💸 Max Withdrawable:** ${BotBranding.formatCurrency(maxWithdrawable)} (after ${(
              bankTier.benefits.withdrawalFee * 100
            ).toFixed(
              1
            )}% fee)\n**💵 Available Cash:** ${BotBranding.formatCurrency(balance.cashOnHand)}\n**📈 Deposit ${BotBranding.formatCurrency(100)} → Get:** ${BotBranding.formatCurrency(depositAfterFee(
              100
            ))} in bank\n**📉 Withdraw ${BotBranding.formatCurrency(100)} → Pay:** ${BotBranding.formatCurrency(Math.floor(
              100 * bankTier.benefits.withdrawalFee
            ))} fee`,
            inline: false,
          });

          // Check upgrade availability
          const upgradeInfo = await moneyService.canUpgradeBank(userId);
          if (upgradeInfo.canUpgrade && upgradeInfo.nextTier) {
            embed.addFields({
              name: "⬆️ Available Upgrade",
              value: `**${
                upgradeInfo.nextTier.name
              }**\nCost: ${BotBranding.formatCurrency(upgradeInfo.nextTier.upgradeCost)}\nUse \`/bank upgrade\` to upgrade`,
              inline: false,
            });
          } else if (upgradeInfo.nextTier) {
            embed.addFields({
              name: "🔒 Next Tier Locked",
              value: `**${upgradeInfo.nextTier.name}**\n${upgradeInfo.reason}`,
              inline: false,
            });
          }

          await ResponseUtil.smartReply(interaction, { embeds: [embed], flags: 64 });
          return { success: true };
        }

        case "upgrade": {
          const upgradeInfo = await moneyService.canUpgradeBank(userId);

          if (!upgradeInfo.canUpgrade) {
            const embed = ResponseUtil.warning(
              "Upgrade Not Available",
              upgradeInfo.reason || "Cannot upgrade at this time"
            );
            await ResponseUtil.smartReply(interaction, { embeds: [embed], flags: 64 });
            return { success: false };
          }

          // TODO: Implement bank upgrade logic
          const embed = ResponseUtil.info(
            "🔨 Feature Coming Soon",
            "Bank upgrades will be available in a future update!"
          );

          await ResponseUtil.smartReply(interaction, { embeds: [embed], flags: 64 });
          return { success: true };
        }

        default:
          const embed = ResponseUtil.error(
            "Invalid Command",
            "Unknown bank subcommand"
          );
          await ResponseUtil.smartReply(interaction, { embeds: [embed], flags: 64 });
          return { success: false };
      }
    } catch (error) {
      logger.error(`Bank command error for user ${userId}:`, error);

      const embed = ResponseUtil.error(
        "Bank Error",
        "Failed to process bank transaction. Please try again."
      );

      await ResponseUtil.smartReply(interaction, { embeds: [embed], flags: 64 });
      return { success: false, error: "Failed to process bank command" };
    }
  },

  cooldown: 3,
  category: "economy",
  description: "Manage your bank account - deposit, withdraw, and upgrade",
};

export default bankCommand;
