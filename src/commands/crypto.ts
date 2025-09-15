import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  SlashCommandBuilder,
} from "discord.js";
import { cryptoCoins } from "../data/money";
import MoneyService from "../services/MoneyService";
import { Command, CommandContext, CommandResult } from "../types/command";
import DatabaseManager from "../utils/DatabaseManager";
import { ResponseUtil, logger } from "../utils/ResponseUtil";

// Helper functions for each subcommand
async function handlePrices(context: CommandContext): Promise<CommandResult> {
  const { interaction, userId, userTag } = context;

  try {
    // Check if user has an account
    const user = await DatabaseManager.getUserForAuth(userId);
    if (!user) {
      const noAccountEmbed = ResponseUtil.noAccount(userTag);
      await ResponseUtil.smartReply(interaction, { embeds: [noAccountEmbed], flags: 64 });
      return { success: false, error: "User not registered" };
    }

    // Defer immediately to avoid timeout

    const moneyService = MoneyService.getInstance();
    const character = user.character!; // Safe because getUserForAuth checks for character existence
    const availableCoins = moneyService.getAvailableCoins(character.level);

    const embed = ResponseUtil.info(
      "📈 Cryptocurrency Market Prices",
      `Current market rates for level ${character.level} players`
    );

    // Get prices for all available coins
    const pricePromises = availableCoins.map(async (coin) => {
      const price = await moneyService.getCoinPrice(coin.id);

      // Get price change from database
      const db = DatabaseManager.getClient();
      const priceData = await db.cryptoPrice.findUnique({
        where: { coinType: coin.id },
      });

      const change24h = priceData?.change24h || 0;
      const changeEmoji = change24h >= 0 ? "📈" : "📉";
      const changeColor = change24h >= 0 ? "+" : "";

      return {
        coin,
        price,
        change24h,
        changeEmoji,
        changeColor,
      };
    });

    const priceData = await Promise.all(pricePromises);

    // Create price display
    for (const data of priceData) {
      const { coin, price, change24h, changeEmoji, changeColor } = data;

      let description = coin.description;
      if (coin.launchLevel && coin.launchLevel > 1) {
        description += `\n*Requires level ${coin.launchLevel}*`;
      }

      embed.addFields({
        name: `${changeEmoji} ${coin.name} (${coin.symbol})`,
        value: `**$${price.toFixed(
          coin.id === "dogecoin" ? 4 : 2
        )}**\n${changeColor}${change24h.toFixed(2)}% (24h)\n${description}`,
        inline: true,
      });
    }

    // Show locked coins for higher levels
    const lockedCoins = cryptoCoins.filter(
      (coin) => coin.launchLevel && character.level < coin.launchLevel
    );

    if (lockedCoins.length > 0) {
      const lockedText = lockedCoins
        .map((coin) => `${coin.name} (Level ${coin.launchLevel})`)
        .join("\n");

      embed.addFields({
        name: "🔒 Locked Currencies",
        value: lockedText,
        inline: false,
      });
    }

    embed.setFooter({
      text: "💡 Use /crypto buy or /crypto sell to trade • Prices update every hour",
    });

    await interaction.editReply({ embeds: [embed] });
    return { success: true };
  } catch (error) {
    logger.error("Error in crypto prices:", error);
    throw error;
  }
}

async function handleBuy(context: CommandContext): Promise<CommandResult> {
  const { interaction, userId, userTag } = context;

  try {
    // Check if user has an account
    const user = await DatabaseManager.getUserForAuth(userId);
    if (!user) {
      const noAccountEmbed = ResponseUtil.noAccount(userTag);
      await ResponseUtil.smartReply(interaction, { embeds: [noAccountEmbed], flags: 64 });
      return { success: false, error: "User not registered" };
    }

    // IMMEDIATELY defer the response to avoid 3-second timeout

    const coinType = interaction.options.getString("coin", true);
    const cashAmount = interaction.options.getInteger("amount", true);
    const paymentMethod =
      (interaction.options.getString("method") as "cash" | "bank") || "cash";

    const moneyService = MoneyService.getInstance();

    // Fast balance check
    const balances = await moneyService.getUserBalance(userId);
    if (!balances) {
      const embed = ResponseUtil.error(
        "Character Not Found",
        "There was an issue with your character. Please contact an administrator."
      );
      await interaction.editReply({ embeds: [embed] });
      return { success: false, error: "No character" };
    }

    const coin = cryptoCoins.find((c) => c.id === coinType);
    if (!coin) {
      const embed = ResponseUtil.error(
        "Invalid Cryptocurrency",
        "The specified cryptocurrency was not found."
      );
      await interaction.editReply({ embeds: [embed] });
      return { success: false, error: "Invalid coin" };
    }

    // Check level requirement
    if (coin.launchLevel && balances.level < coin.launchLevel) {
      const embed = ResponseUtil.error(
        "Level Requirement Not Met",
        `${coin.name} requires level ${coin.launchLevel}. You are level ${balances.level}.`
      );
      await interaction.editReply({ embeds: [embed] });
      return { success: false, error: "Level requirement" };
    }

    // Check payment method availability
    const sourceBalance =
      paymentMethod === "cash" ? balances.cashOnHand : balances.bankBalance;

    if (sourceBalance < cashAmount) {
      // Get current price for calculations
      const currentPrice = await moneyService.getCoinPrice(coinType);
      const maxAmounts = moneyService.calculateMaxAmounts(
        balances,
        currentPrice
      );
      const maxBuyAmount =
        paymentMethod === "cash"
          ? maxAmounts.maxCashBuy
          : maxAmounts.maxBankBuy;

      const embed = ResponseUtil.error(
        "Insufficient Funds",
        `You need $${cashAmount.toLocaleString()} but only have $${sourceBalance.toLocaleString()} in ${paymentMethod}.`
      );

      if (maxBuyAmount >= 10) {
        const maxFee = Math.floor(maxBuyAmount * 0.03);
        const maxNetAmount = maxBuyAmount - maxFee;
        const maxCoinAmount = maxNetAmount / currentPrice;

        embed.addFields({
          name: "💡 Buy Maximum Instead?",
          value: `**Your ${
            paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)
          }:** $${sourceBalance.toLocaleString()}\n**Current Price:** $${currentPrice.toFixed(
            coin.id === "dogecoin" ? 4 : 2
          )} per ${
            coin.symbol
          }\n**Fee (3%):** $${maxFee.toLocaleString()}\n**Net Investment:** $${maxNetAmount.toLocaleString()}\n**You'd Get:** ${maxCoinAmount.toFixed(
            6
          )} ${coin.symbol}`,
          inline: false,
        });

        // Create buttons for user choice
        const confirmButton = new ButtonBuilder()
          .setCustomId(`crypto_buy_max_${coinType}_${paymentMethod}_${userId}`)
          .setLabel(`✅ Buy Max ${coin.symbol}`)
          .setStyle(ButtonStyle.Success);

        const switchButton = new ButtonBuilder()
          .setCustomId(`crypto_buy_switch_${coinType}_${userId}`)
          .setLabel(`🔄 Use ${paymentMethod === "cash" ? "Bank" : "Cash"}`)
          .setStyle(ButtonStyle.Primary);

        const cancelButton = new ButtonBuilder()
          .setCustomId(`crypto_buy_cancel_${userId}`)
          .setLabel("❌ Cancel")
          .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          confirmButton,
          switchButton,
          cancelButton
        );

        const response = await interaction.editReply({
          embeds: [embed],
          components: [row],
        });

        // Handle button interactions
        try {
          const buttonInteraction = await response.awaitMessageComponent({
            componentType: ComponentType.Button,
            time: 30000,
            filter: (i) => i.user.id === userId,
          });

          const customId = buttonInteraction.customId;

          if (
            customId === `crypto_buy_max_${coinType}_${paymentMethod}_${userId}`
          ) {
            // Execute max purchase
            await buttonInteraction.deferUpdate();

            const result = await moneyService.buyCrypto(
              userId,
              coinType,
              maxBuyAmount,
              paymentMethod
            );

            if (!result.success) {
              const errorEmbed = ResponseUtil.error(
                "Purchase Failed",
                result.message
              );
              await buttonInteraction.editReply({
                embeds: [errorEmbed],
                components: [],
              });
              return { success: false, error: result.error };
            }

            const successEmbed = ResponseUtil.success(
              "✅ Maximum Cryptocurrency Purchased",
              `Successfully bought ${coin.name} with all your available ${paymentMethod}!`
            );

            successEmbed.addFields(
              {
                name: "💰 Transaction Details",
                value: `**Spent:** $${maxBuyAmount.toLocaleString()}\n**Fee:** $${maxFee.toLocaleString()} (3%)\n**Net Amount:** $${maxNetAmount.toLocaleString()}`,
                inline: true,
              },
              {
                name: `₿ ${coin.symbol} Acquired`,
                value: `**Amount:** ${maxCoinAmount.toFixed(6)} ${
                  coin.symbol
                }\n**Price:** $${currentPrice.toFixed(
                  coin.id === "dogecoin" ? 4 : 2
                )} per ${
                  coin.symbol
                }\n**Value:** $${maxNetAmount.toLocaleString()}`,
                inline: true,
              },
              {
                name: "💵 Updated Balance",
                value: `**Cash:** $${
                  paymentMethod === "cash"
                    ? result.data?.fromBalance.toLocaleString()
                    : balances.cashOnHand.toLocaleString()
                }\n**Bank:** $${
                  paymentMethod === "bank"
                    ? result.data?.fromBalance.toLocaleString()
                    : balances.bankBalance.toLocaleString()
                }`,
                inline: false,
              }
            );

            await buttonInteraction.editReply({
              embeds: [successEmbed],
              components: [],
            });
            return { success: true };
          } else if (customId === `crypto_buy_switch_${coinType}_${userId}`) {
            // Switch payment method
            await buttonInteraction.deferUpdate();
            const newMethod = paymentMethod === "cash" ? "bank" : "cash";
            const newBalance =
              newMethod === "cash" ? balances.cashOnHand : balances.bankBalance;

            if (newBalance >= cashAmount) {
              // Execute purchase with new method
              const result = await moneyService.buyCrypto(
                userId,
                coinType,
                cashAmount,
                newMethod
              );

              if (!result.success) {
                const errorEmbed = ResponseUtil.error(
                  "Purchase Failed",
                  result.message
                );
                await buttonInteraction.editReply({
                  embeds: [errorEmbed],
                  components: [],
                });
                return { success: false, error: result.error };
              }

              const successEmbed = ResponseUtil.success(
                "✅ Cryptocurrency Purchased",
                `Successfully bought ${coin.name} using ${newMethod}!`
              );

              const fee = Math.floor(cashAmount * 0.03);
              const netAmount = cashAmount - fee;
              const coinAmount = netAmount / currentPrice;

              successEmbed.addFields(
                {
                  name: "💰 Transaction Details",
                  value: `**Spent:** $${cashAmount.toLocaleString()}\n**Fee:** $${fee.toLocaleString()} (3%)\n**Net Amount:** $${netAmount.toLocaleString()}`,
                  inline: true,
                },
                {
                  name: `₿ ${coin.symbol} Acquired`,
                  value: `**Amount:** ${coinAmount.toFixed(6)} ${
                    coin.symbol
                  }\n**Price:** $${currentPrice.toFixed(
                    coin.id === "dogecoin" ? 4 : 2
                  )} per ${
                    coin.symbol
                  }\n**Value:** $${netAmount.toLocaleString()}`,
                  inline: true,
                }
              );

              await buttonInteraction.editReply({
                embeds: [successEmbed],
                components: [],
              });
              return { success: true };
            } else {
              const switchEmbed = ResponseUtil.error(
                "Insufficient Funds",
                `Not enough ${newMethod} either. You have $${newBalance.toLocaleString()} in ${newMethod}.`
              );
              await buttonInteraction.editReply({
                embeds: [switchEmbed],
                components: [],
              });
              return {
                success: false,
                error: "Insufficient funds in both accounts",
              };
            }
          } else if (customId === `crypto_buy_cancel_${userId}`) {
            // Cancel operation
            await buttonInteraction.deferUpdate();

            const cancelEmbed = ResponseUtil.info(
              "❌ Purchase Cancelled",
              "Your cryptocurrency purchase has been cancelled."
            );
            await buttonInteraction.editReply({
              embeds: [cancelEmbed],
              components: [],
            });
            return { success: false, error: "User cancelled" };
          }
        } catch (error) {
          const timeoutEmbed = ResponseUtil.error(
            "⏰ Request Timeout",
            "The purchase request has timed out. Please try again."
          );
          await interaction.editReply({
            embeds: [timeoutEmbed],
            components: [],
          });
          return { success: false, error: "Timeout" };
        }
      } else {
        embed.addFields({
          name: "💡 Need More Money",
          value: `• Use \`/crime\` to earn money\n• You need at least $10 to buy cryptocurrency\n• Check other payment methods if available`,
          inline: false,
        });

        await interaction.editReply({ embeds: [embed] });
      }

      return { success: false, error: "Insufficient funds" };
    }

    // Proceed with normal purchase using optimized money service
    const result = await moneyService.buyCrypto(
      userId,
      coinType,
      cashAmount,
      paymentMethod
    );

    if (!result.success) {
      const embed = ResponseUtil.error("Purchase Failed", result.message);
      await interaction.editReply({ embeds: [embed] });
      return { success: false, error: result.error };
    }

    const embed = ResponseUtil.success(
      "✅ Cryptocurrency Purchased",
      `Successfully bought ${coin.name}!`
    );

    const fee = Math.floor(cashAmount * 0.03);
    const netAmount = cashAmount - fee;
    const currentPrice = await moneyService.getCoinPrice(coinType);

    embed.addFields(
      {
        name: "💰 Transaction Details",
        value: `**Spent:** $${cashAmount.toLocaleString()}\n**Fee:** $${fee.toLocaleString()} (3%)\n**Net Amount:** $${netAmount.toLocaleString()}`,
        inline: true,
      },
      {
        name: `₿ ${coin.symbol} Acquired`,
        value: `**Amount:** ${result.data?.coinAmount?.toFixed(6)} ${
          coin.symbol
        }\n**Price:** $${currentPrice.toFixed(
          coin.id === "dogecoin" ? 4 : 2
        )} per ${coin.symbol}\n**Value:** $${netAmount.toLocaleString()}`,
        inline: true,
      },
      {
        name: "💵 Updated Balance",
        value: `**Cash:** $${
          paymentMethod === "cash"
            ? result.data?.fromBalance.toLocaleString()
            : balances.cashOnHand.toLocaleString()
        }\n**Bank:** $${
          paymentMethod === "bank"
            ? result.data?.fromBalance.toLocaleString()
            : balances.bankBalance.toLocaleString()
        }`,
        inline: false,
      }
    );

    await interaction.editReply({ embeds: [embed] });
    return { success: true };
  } catch (error) {
    logger.error("Error in crypto buy:", error);
    throw error;
  }
}

async function handleSell(context: CommandContext): Promise<CommandResult> {
  const { interaction, userId, userTag } = context;

  try {
    // Check if user has an account
    const user = await DatabaseManager.getUserForAuth(userId);
    if (!user) {
      const noAccountEmbed = ResponseUtil.noAccount(userTag);
      await ResponseUtil.smartReply(interaction, { embeds: [noAccountEmbed], flags: 64 });
      return { success: false, error: "User not registered" };
    }

    // Defer immediately to avoid timeout

    const coinType = interaction.options.getString("coin", true);
    const coinAmount = interaction.options.getNumber("amount", true);

    const coin = cryptoCoins.find((c) => c.id === coinType);

    if (!coin) {
      const embed = ResponseUtil.error(
        "Invalid Cryptocurrency",
        "The specified cryptocurrency was not found."
      );
      await interaction.editReply({ embeds: [embed] });
      return { success: false, error: "Invalid coin" };
    }

    // Get current holdings using fast service
    const balance = await MoneyService.getInstance().getUserBalance(userId);
    // Check if user has any of this coin
    const currentHolding = balance?.cryptoWallet[coinType] || 0;

    if (currentHolding === 0) {
      const embed = ResponseUtil.error(
        "❌ No Holdings",
        `You don't own any ${coin.name}. You need to purchase some first before you can sell.`
      );

      embed.addFields({
        name: "💡 Get Started with Crypto Trading",
        value: `• Use \`/crypto prices\` to see current market rates\n• Use \`/crypto buy ${coinType} <amount>\` to purchase ${coin.name}\n• Start with a small amount to test the system`,
        inline: false,
      });

      embed.setFooter({
        text: `💰 ${coin.name} is available for purchase • Check your cash with /wallet`,
      });

      await interaction.editReply({ embeds: [embed] });
      return { success: false, error: "No holdings" };
    }

    if (coinAmount > currentHolding) {
      // Calculate what user would get if they sold their maximum holdings
      const maxCoinAmount = currentHolding;
      const maxPrice = await MoneyService.getInstance().getCoinPrice(coinType);
      const maxGrossAmount = maxCoinAmount * maxPrice;
      const maxFee = Math.floor(maxGrossAmount * 0.04); // 4% selling fee
      const maxNetCash = maxGrossAmount - maxFee;

      const embed = ResponseUtil.error(
        "Insufficient Holdings",
        `You only have ${currentHolding.toFixed(6)} ${
          coin.symbol
        }. You cannot sell ${coinAmount.toFixed(6)} ${coin.symbol}.`
      );

      embed.addFields({
        name: "💡 Sell Maximum Instead?",
        value: `**Your Holdings:** ${maxCoinAmount.toFixed(6)} ${
          coin.symbol
        }\n**Current Price:** $${maxPrice.toFixed(
          coin.id === "dogecoin" ? 4 : 2
        )}\n**Gross Value:** $${Math.floor(
          maxGrossAmount
        ).toLocaleString()}\n**Fee (4%):** $${maxFee.toLocaleString()}\n**You'd Receive:** $${maxNetCash.toLocaleString()}`,
        inline: false,
      });

      // Create buttons for user choice
      const confirmButton = new ButtonBuilder()
        .setCustomId(`crypto_sell_max_${coinType}_${userId}`)
        .setLabel(`✅ Sell All ${coin.symbol}`)
        .setStyle(ButtonStyle.Success);

      const cancelButton = new ButtonBuilder()
        .setCustomId(`crypto_sell_cancel_${userId}`)
        .setLabel("❌ Cancel")
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        confirmButton,
        cancelButton
      );

      const response = await interaction.editReply({
        embeds: [embed],
        components: [row],
      });

      // Handle button interactions
      try {
        const buttonInteraction = await response.awaitMessageComponent({
          componentType: ComponentType.Button,
          time: 30000, // 30 seconds timeout
          filter: (i) => i.user.id === userId,
        });

        if (
          buttonInteraction.customId === `crypto_sell_max_${coinType}_${userId}`
        ) {
          // Execute max sale
          await buttonInteraction.deferUpdate();

          const moneyService = MoneyService.getInstance();
          const maxResult = await moneyService.sellCrypto(
            userId,
            coinType,
            maxCoinAmount
          );

          if (!maxResult.success) {
            const errorEmbed = ResponseUtil.error(
              "Sale Failed",
              maxResult.message || "Unable to complete the sale."
            );
            await buttonInteraction.editReply({
              embeds: [errorEmbed],
              components: [],
            });
            return { success: false, error: maxResult.error };
          }

          const successEmbed = ResponseUtil.success(
            "✅ Maximum Cryptocurrency Sold",
            `Successfully sold all your ${coin.name}!`
          );

          successEmbed.addFields(
            {
              name: `₿ ${coin.symbol} Sold`,
              value: `**Amount:** ${maxCoinAmount.toFixed(6)} ${
                coin.symbol
              }\n**Price:** $${maxPrice.toFixed(
                coin.id === "dogecoin" ? 4 : 2
              )} per ${coin.symbol}\n**Gross Value:** $${Math.floor(
                maxGrossAmount
              ).toLocaleString()}`,
              inline: true,
            },
            {
              name: "💰 Cash Received",
              value: `**Gross Amount:** $${Math.floor(
                maxGrossAmount
              ).toLocaleString()}\n**Fee:** $${maxFee.toLocaleString()} (4%)\n**Net Cash:** $${maxNetCash.toLocaleString()}`,
              inline: true,
            },
            {
              name: "💵 Updated Balance",
              value: `**Cash:** $${maxResult.data?.toBalance.toLocaleString()}\n**${
                coin.symbol
              } Remaining:** 0.000000\n**Total Worth:** $${maxResult.data?.toBalance.toLocaleString()}`,
              inline: false,
            }
          );

          successEmbed.setFooter({
            text: "💡 Use /crypto portfolio to view remaining holdings • All holdings sold successfully",
          });

          await buttonInteraction.editReply({
            embeds: [successEmbed],
            components: [],
          });
          return { success: true };
        } else if (
          buttonInteraction.customId === `crypto_sell_cancel_${userId}`
        ) {
          // Cancel operation
          await buttonInteraction.deferUpdate();

          const cancelEmbed = ResponseUtil.info(
            "❌ Sale Cancelled",
            "Your cryptocurrency sale has been cancelled. No changes were made to your portfolio."
          );

          cancelEmbed.setFooter({
            text: "💡 Use /crypto sell with a smaller amount or /crypto portfolio to check your exact holdings",
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
          "The sale request has timed out. Please try again if you still want to sell your cryptocurrency."
        );

        try {
          await interaction.editReply({
            embeds: [timeoutEmbed],
            components: [],
          });
        } catch (editError) {
          // If we can't edit, the interaction might have expired
          logger.warn("Could not edit interaction after timeout:", editError);
        }

        return { success: false, error: "Timeout" };
      }

      return { success: false, error: "Insufficient holdings" };
    }

    // Get current price for display
    const currentPrice = await MoneyService.getInstance().getCoinPrice(
      coinType
    );
    const grossAmount = coinAmount * currentPrice;
    const fee = Math.floor(grossAmount * 0.04); // 4% selling fee
    const netCash = grossAmount - fee;

    // Execute the sale
    const moneyService = MoneyService.getInstance();
    const result = await moneyService.sellCrypto(userId, coinType, coinAmount);

    if (!result.success) {
      const embed = ResponseUtil.error(
        "Sale Failed",
        result.message || "Unable to complete the sale."
      );
      await interaction.editReply({ embeds: [embed] });
      return { success: false, error: result.error };
    }

    const embed = ResponseUtil.success(
      "✅ Cryptocurrency Sold",
      `Successfully sold ${coin.name}!`
    );

    embed.addFields(
      {
        name: `₿ ${coin.symbol} Sold`,
        value: `**Amount:** ${coinAmount.toFixed(6)} ${
          coin.symbol
        }\n**Price:** $${currentPrice.toFixed(
          coin.id === "dogecoin" ? 4 : 2
        )} per ${coin.symbol}\n**Gross Value:** $${Math.floor(
          grossAmount
        ).toLocaleString()}`,
        inline: true,
      },
      {
        name: "💰 Cash Received",
        value: `**Gross Amount:** $${Math.floor(
          grossAmount
        ).toLocaleString()}\n**Fee:** $${fee.toLocaleString()} (4%)\n**Net Cash:** $${netCash.toLocaleString()}`,
        inline: true,
      },
      {
        name: "💵 Updated Balance",
        value: `**Cash:** $${result.data?.toBalance.toLocaleString()}\n**${
          coin.symbol
        } Remaining:** ${(currentHolding - coinAmount).toFixed(
          6
        )}\n**Total Worth:** $${result.data?.toBalance.toLocaleString()}`,
        inline: false,
      }
    );

    embed.setFooter({
      text: "💡 Use /crypto portfolio to view all holdings • Selling fees are higher than buying fees",
    });

    await interaction.editReply({ embeds: [embed] });
    return { success: true };
  } catch (error) {
    logger.error("Error in crypto sell:", error);
    throw error;
  }
}

async function handlePortfolio(
  context: CommandContext
): Promise<CommandResult> {
  const { interaction, userId, userTag } = context;

  try {
    // Check if user has an account
    const user = await DatabaseManager.getUserForAuth(userId);
    if (!user) {
      const noAccountEmbed = ResponseUtil.noAccount(userTag);
      await ResponseUtil.smartReply(interaction, { embeds: [noAccountEmbed], flags: 64 });
      return { success: false, error: "User not registered" };
    }

    // Defer immediately to avoid timeout

    const moneyService = MoneyService.getInstance();
    const balance = await moneyService.getUserBalance(userId);

    const embed = ResponseUtil.info(
      "₿ Your Cryptocurrency Portfolio",
      `Complete overview of your digital assets`
    );

    if (!balance || Object.keys(balance.cryptoWallet).length === 0) {
      embed.addFields({
        name: "📭 Empty Portfolio",
        value:
          "You don't own any cryptocurrency yet.\n\n💡 **Get Started:**\n• Use `/crypto prices` to see available coins\n• Use `/crypto buy` to make your first purchase\n• Build your portfolio with different coins for diversification",
        inline: false,
      });

      embed.setFooter({
        text: "💰 Start with Bitcoin or Ethereum for stable investments",
      });
    } else {
      let totalCryptoValue = 0;
      const holdings: string[] = [];

      // Process each holding
      for (const [coinType, amount] of Object.entries(balance.cryptoWallet)) {
        const coin = cryptoCoins.find((c) => c.id === coinType);
        const price = await moneyService.getCoinPrice(coinType);
        const value = (amount as number) * price;
        totalCryptoValue += value;

        // Get price change data
        const db = DatabaseManager.getClient();
        const priceData = await db.cryptoPrice.findUnique({
          where: { coinType },
        });

        const change24h = priceData?.change24h || 0;
        const changeEmoji = change24h >= 0 ? "📈" : "📉";
        const changeColor = change24h >= 0 ? "+" : "";

        holdings.push(
          `${changeEmoji} **${coin?.name || coinType}** (${
            coin?.symbol || coinType.toUpperCase()
          })\n` +
            `${(amount as number).toFixed(6)} ${
              coin?.symbol || coinType.toUpperCase()
            } × $${price.toFixed(
              coin?.id === "dogecoin" ? 4 : 2
            )} = **$${value.toFixed(2)}**\n` +
            `${changeColor}${change24h.toFixed(2)}% (24h)`
        );
      }

      // Portfolio overview
      embed.addFields({
        name: "📊 Portfolio Summary",
        value: `**Total Crypto Value:** $${totalCryptoValue.toLocaleString()}\n**Number of Holdings:** ${
          Object.keys(balance.cryptoWallet).length
        }\n**Crypto % of Net Worth:** ${(
          (totalCryptoValue / (balance.totalValue || 1)) *
          100
        ).toFixed(1)}%`,
        inline: false,
      });

      // Individual holdings
      const holdingsPerField = 3;
      for (let i = 0; i < holdings.length; i += holdingsPerField) {
        const fieldHoldings = holdings.slice(i, i + holdingsPerField);
        embed.addFields({
          name: i === 0 ? "💎 Your Holdings" : "‌", // Zero-width space for continuation
          value: fieldHoldings.join("\n\n"),
          inline: false,
        });
      }

      // Portfolio distribution
      if (Object.keys(balance.cryptoWallet).length > 1) {
        const distribution = Object.entries(balance.cryptoWallet).map(
          ([coinType, amount]) => {
            const coin = cryptoCoins.find((c) => c.id === coinType);
            const price = moneyService.getCoinPrice(coinType);
            return price.then((p) => {
              const value = (amount as number) * p;
              const percentage = (value / totalCryptoValue) * 100;
              return `${
                coin?.symbol || coinType.toUpperCase()
              }: ${percentage.toFixed(1)}%`;
            });
          }
        );

        const distributionText = await Promise.all(distribution);

        embed.addFields({
          name: "📊 Portfolio Distribution",
          value: distributionText.join(" • "),
          inline: false,
        });
      }

      embed.setFooter({
        text: "💡 Diversify your portfolio • Use /crypto prices for market updates • Consider your risk tolerance",
      });
    }

    await interaction.editReply({ embeds: [embed] });
    return { success: true };
  } catch (error) {
    logger.error("Error in crypto portfolio:", error);
    throw error;
  }
}

const cryptoCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("crypto")
    .setDescription("Cryptocurrency trading platform")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("prices")
        .setDescription("View current cryptocurrency market prices")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("buy")
        .setDescription("Purchase cryptocurrency with cash or bank funds")
        .addStringOption((option) =>
          option
            .setName("coin")
            .setDescription("Cryptocurrency to buy")
            .setRequired(true)
            .addChoices(
              { name: "Bitcoin (BTC)", value: "bitcoin" },
              { name: "Ethereum (ETH)", value: "ethereum" },
              { name: "Dogecoin (DOGE)", value: "dogecoin" },
              { name: "MafiaCoin (MAFIA)", value: "mafiacoin" },
              { name: "CrimeChain (CRIME)", value: "crimechain" }
            )
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("Amount of cash to spend (USD)")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(1000000)
        )
        .addStringOption((option) =>
          option
            .setName("method")
            .setDescription("Payment method to use")
            .setRequired(false)
            .addChoices(
              { name: "Cash", value: "cash" },
              { name: "Bank Account", value: "bank" }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("sell")
        .setDescription("Sell cryptocurrency for cash")
        .addStringOption((option) =>
          option
            .setName("coin")
            .setDescription("Cryptocurrency to sell")
            .setRequired(true)
            .addChoices(
              { name: "Bitcoin (BTC)", value: "bitcoin" },
              { name: "Ethereum (ETH)", value: "ethereum" },
              { name: "Dogecoin (DOGE)", value: "dogecoin" },
              { name: "MafiaCoin (MAFIA)", value: "mafiacoin" },
              { name: "CrimeChain (CRIME)", value: "crimechain" }
            )
        )
        .addNumberOption((option) =>
          option
            .setName("amount")
            .setDescription("Amount of cryptocurrency to sell")
            .setRequired(true)
            .setMinValue(0.000001)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("portfolio")
        .setDescription("View your cryptocurrency holdings and values")
    ),

  async execute(context: CommandContext): Promise<CommandResult> {
    const { interaction, userId, userTag } = context;
    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case "prices":
          return await handlePrices(context);
        case "buy":
          return await handleBuy(context);
        case "sell":
          return await handleSell(context);
        case "portfolio":
          return await handlePortfolio(context);
        default:
          await ResponseUtil.smartReply(interaction, {
            content: "Unknown subcommand",
            flags: 64,
          });
          return { success: false, error: "Unknown subcommand" };
      }
    } catch (error) {
      logger.error(`Crypto command error for user ${userId}:`, error);

      const embed = ResponseUtil.error(
        "Crypto Trading Error",
        "An error occurred while processing your crypto transaction. Please try again."
      );

      await ResponseUtil.smartReply(interaction, { embeds: [embed], flags: 64 });
      return { success: false, error: "Crypto command failed" };
    }
  },

  cooldown: 3,
  category: "economy",
  description:
    "Complete cryptocurrency trading platform with market prices, buying, selling, and portfolio management",
};

export default cryptoCommand;
