import { SlashCommandBuilder } from "discord.js";
import MoneyService from "../services/MoneyService";
import { Command, CommandContext, CommandResult } from "../types/command";
import { ResponseUtil, logger } from "../utils/ResponseUtil";

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
      const moneyService = MoneyService.getInstance();

      switch (subcommand) {
        case "deposit": {
          const amount = interaction.options.getInteger("amount", true);
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
                value: `💵 Cash: $${result.newBalance.cashOnHand.toLocaleString()}\n🏦 Bank: $${result.newBalance.bankBalance.toLocaleString()}`,
                inline: false,
              });
            }
          } else {
            embed = ResponseUtil.error("Deposit Failed", result.message);
          }

          await interaction.reply({ embeds: [embed], flags: 64 });
          return { success: result.success };
        }

        case "withdraw": {
          const amount = interaction.options.getInteger("amount", true);
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
                value: `💵 Cash: $${result.newBalance.cashOnHand.toLocaleString()}\n🏦 Bank: $${result.newBalance.bankBalance.toLocaleString()}`,
                inline: false,
              });
            }
          } else {
            embed = ResponseUtil.warning("Withdrawal Failed", result.message);
          }

          await interaction.reply({ embeds: [embed], flags: 64 });
          return { success: result.success };
        }

        case "info": {
          const balance = await moneyService.getUserBalance(userId);

          // Get user's current bank tier
          const user = await MoneyService.getInstance().getUserBalance(userId);
          // For now, assume level 1 bank - this should be from database
          const bankTier = moneyService.getUserBankTier(1);

          const embed = ResponseUtil.info(
            "🏦 Bank Account Information",
            `**${bankTier.name}**\n${
              balance.bankBalance > 0
                ? `Current Balance: $${balance.bankBalance.toLocaleString()}`
                : "No current balance"
            }`
          );

          embed.addFields({
            name: "💰 Benefits",
            value: `• Daily Withdrawal Limit: $${bankTier.benefits.withdrawalLimit.toLocaleString()}\n• Interest Rate: ${(
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
          const maxWithdrawable = Math.floor(balance.bankBalance / (1 + bankTier.benefits.withdrawalFee));
          const maxDepositFromCash = balance.cashOnHand;
          const depositAfterFee = (amount: number) => Math.floor(amount * (1 - bankTier.benefits.depositFee));
          
          embed.addFields({
            name: "💡 Quick Reference",
            value: `**💸 Max Withdrawable:** $${maxWithdrawable.toLocaleString()} (after ${(bankTier.benefits.withdrawalFee * 100).toFixed(1)}% fee)\n**💵 Available Cash:** $${balance.cashOnHand.toLocaleString()}\n**📈 Deposit $100 → Get:** $${depositAfterFee(100)} in bank\n**📉 Withdraw $100 → Pay:** $${Math.floor(100 * bankTier.benefits.withdrawalFee)} fee`,
            inline: false,
          });

          // Check upgrade availability
          const upgradeInfo = await moneyService.canUpgradeBank(userId);
          if (upgradeInfo.canUpgrade && upgradeInfo.nextTier) {
            embed.addFields({
              name: "⬆️ Available Upgrade",
              value: `**${
                upgradeInfo.nextTier.name
              }**\nCost: $${upgradeInfo.nextTier.upgradeCost.toLocaleString()}\nUse \`/bank upgrade\` to upgrade`,
              inline: false,
            });
          } else if (upgradeInfo.nextTier) {
            embed.addFields({
              name: "🔒 Next Tier Locked",
              value: `**${upgradeInfo.nextTier.name}**\n${upgradeInfo.reason}`,
              inline: false,
            });
          }

          await interaction.reply({ embeds: [embed], flags: 64 });
          return { success: true };
        }

        case "upgrade": {
          const upgradeInfo = await moneyService.canUpgradeBank(userId);

          if (!upgradeInfo.canUpgrade) {
            const embed = ResponseUtil.warning(
              "Upgrade Not Available",
              upgradeInfo.reason || "Cannot upgrade at this time"
            );
            await interaction.reply({ embeds: [embed], flags: 64 });
            return { success: false };
          }

          // TODO: Implement bank upgrade logic
          const embed = ResponseUtil.info(
            "🔨 Feature Coming Soon",
            "Bank upgrades will be available in a future update!"
          );

          await interaction.reply({ embeds: [embed], flags: 64 });
          return { success: true };
        }

        default:
          const embed = ResponseUtil.error(
            "Invalid Command",
            "Unknown bank subcommand"
          );
          await interaction.reply({ embeds: [embed], flags: 64 });
          return { success: false };
      }
    } catch (error) {
      logger.error(`Bank command error for user ${userId}:`, error);

      const embed = ResponseUtil.error(
        "Bank Error",
        "Failed to process bank transaction. Please try again."
      );

      await interaction.reply({ embeds: [embed], flags: 64 });
      return { success: false, error: "Failed to process bank command" };
    }
  },

  cooldown: 3,
  category: "economy",
  description: "Manage your bank account - deposit, withdraw, and upgrade",
};

export default bankCommand;
