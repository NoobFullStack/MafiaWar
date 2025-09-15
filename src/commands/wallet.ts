import { SlashCommandBuilder } from "discord.js";
import { cryptoCoins } from "../data/money";
import MoneyService from "../services/MoneyService";
import { Command, CommandContext, CommandResult } from "../types/command";
import { ResponseUtil, logger } from "../utils/ResponseUtil";
import DatabaseManager from "../utils/DatabaseManager";
import { BotBranding } from "../config/bot";

const walletCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("wallet")
    .setDescription("View your complete money portfolio"),

  async execute(context: CommandContext): Promise<CommandResult> {
    const { interaction, userId, userTag } = context;

    try {
      // Check if user has an account
      const user = await DatabaseManager.getUserForAuth(userId);
      if (!user) {
        const noAccountEmbed = ResponseUtil.noAccount(userTag);
        await ResponseUtil.smartReply(interaction, { embeds: [noAccountEmbed], flags: 64 });
        return { success: false, error: "User not registered" };
      }

      const moneyService = MoneyService.getInstance();
      const balance = await moneyService.getUserBalance(userId, true);

      if (!balance) {
        const embed = ResponseUtil.error(
          "Character Not Found",
          "There was an issue with your character. Please contact an administrator."
        );
        await ResponseUtil.smartReply(interaction, { embeds: [embed], flags: 64 });
        return { success: false, error: "No character" };
      }

      // Create portfolio display
      let cryptoDisplay = "None";
      if (Object.keys(balance.cryptoWallet).length > 0) {
        const cryptoLines: string[] = [];
        for (const [coinType, amount] of Object.entries(balance.cryptoWallet)) {
          const coin = cryptoCoins.find((c) => c.id === coinType);
          const price = await moneyService.getCoinPrice(coinType);
          const value = (amount as number) * price;

          cryptoLines.push(
            `${coin?.symbol || coinType.toUpperCase()}: ${(
              amount as number
            ).toFixed(6)} (${BotBranding.formatCurrency(value)})`
          );
        }
        cryptoDisplay = cryptoLines.join("\n");
      }

      const embed = ResponseUtil.info(
        "💰 Your Wallet",
        `**Total Net Worth: ${BotBranding.formatCurrency(balance.totalValue || 0)}**`
      );

      embed.addFields(
        {
          name: "💵 Cash on Hand",
          value: `${BotBranding.formatCurrency(balance.cashOnHand)}\n*Vulnerable to theft*`,
          inline: true,
        },
        {
          name: "🏦 Bank Account",
          value: `${BotBranding.formatCurrency(balance.bankBalance)}\n*Protected from players*`,
          inline: true,
        },
        {
          name: "₿ Cryptocurrency",
          value: cryptoDisplay + "\n*Market volatility risk*",
          inline: false,
        }
      );

      embed.setFooter({
        text: "💡 Use /bank or /crypto commands to manage your money",
      });

      await ResponseUtil.smartReply(interaction, { embeds: [embed], flags: 64 });
      return { success: true };
    } catch (error) {
      logger.error(`Wallet command error for user ${userId}:`, error);

      const embed = ResponseUtil.error(
        "Wallet Error",
        "Failed to load your wallet information. Please try again."
      );

      await ResponseUtil.smartReply(interaction, { embeds: [embed], flags: 64 });
      return { success: false, error: "Failed to load wallet" };
    }
  },

  cooldown: 5,
  category: "economy",
  description:
    "View your complete money portfolio including cash, bank, and crypto",
};

export default walletCommand;
