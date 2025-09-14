import { SlashCommandBuilder } from "discord.js";
import { cryptoCoins } from "../data/money";
import MoneyService from "../services/MoneyService";
import { Command, CommandContext, CommandResult } from "../types/command";
import { ResponseUtil, logger } from "../utils/ResponseUtil";

const walletCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("wallet")
    .setDescription("View your complete money portfolio"),

  async execute(context: CommandContext): Promise<CommandResult> {
    const { interaction, userId, userTag } = context;

    try {
      const moneyService = MoneyService.getInstance();
      const balance = await moneyService.getUserBalance(userId);

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
            ).toFixed(6)} ($${value.toFixed(2)})`
          );
        }
        cryptoDisplay = cryptoLines.join("\n");
      }

      const embed = ResponseUtil.info(
        "💰 Your Wallet",
        `**Total Net Worth: $${balance.totalValue.toLocaleString()}**`
      );

      embed.addFields(
        {
          name: "💵 Cash on Hand",
          value: `$${balance.cashOnHand.toLocaleString()}\n*Vulnerable to theft*`,
          inline: true,
        },
        {
          name: "🏦 Bank Account",
          value: `$${balance.bankBalance.toLocaleString()}\n*Protected from players*`,
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

      await interaction.reply({ embeds: [embed] });
      return { success: true };
    } catch (error) {
      logger.error(`Wallet command error for user ${userId}:`, error);

      const embed = ResponseUtil.error(
        "Wallet Error",
        "Failed to load your wallet information. Please try again."
      );

      await interaction.reply({ embeds: [embed], flags: 64 });
      return { success: false, error: "Failed to load wallet" };
    }
  },

  cooldown: 5,
  category: "economy",
  description:
    "View your complete money portfolio including cash, bank, and crypto",
};

export default walletCommand;
