import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  SlashCommandBuilder,
} from "discord.js";
import { BotBranding } from "../config/bot";
import { getCryptoCoin } from "../data/money";
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
      await ResponseUtil.smartReply(interaction, {
        embeds: [noAccountEmbed],
        flags: 64,
      });
      return { success: false, error: "User not registered" };
    }

    // Defer for heavy operations (database queries, calculations)
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    const moneyService = MoneyService.getInstance();
    const character = user.character!; // Safe because getUserForAuth checks for character existence
    const coin = getCryptoCoin();

    const embed = ResponseUtil.info(
      "📈 Cryptocurrency Market Price",
      `Current market rate for ${coin.name}`
    );

    // Get price for the single coin
    const price = await moneyService.getCoinPrice(coin.symbol);

    // Get price change from database
    const db = DatabaseManager.getClient();
    const priceData = await db.cryptoPrice.findUnique({
      where: { coinType: coin.symbol },
    });

    const change24h = priceData?.change24h || 0;
    const changeEmoji = change24h >= 0 ? "📈" : "📉";
    const changeColor = change24h >= 0 ? "+" : "";

    let description = coin.description;

    embed.addFields({
      name: `${changeEmoji} ${coin.name} (${coin.symbol})`,
      value: `**${BotBranding.formatCurrency(
        parseFloat(price.toFixed(2))
      )}**\n${changeColor}${change24h.toFixed(2)}% (24h)\n${description}`,
      inline: false,
    });

    embed.setFooter({
      text: "💡 Use /crypto buy or /crypto sell to trade • Prices update every hour",
    });

    await ResponseUtil.smartReply(interaction, { embeds: [embed] });
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
      await ResponseUtil.smartReply(interaction, {
        embeds: [noAccountEmbed],
        flags: 64,
      });
      return { success: false, error: "User not registered" };
    }

    // Defer for heavy operations (database queries, calculations)
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    const cashAmount = interaction.options.getInteger("amount", true);
    const paymentMethod =
      (interaction.options.getString("method") as "cash" | "bank") || "cash";

    const moneyService = MoneyService.getInstance();
    const coin = getCryptoCoin();

    // Fast balance check
    const balances = await moneyService.getUserBalance(userId);
    if (!balances) {
      const embed = ResponseUtil.error(
        "Character Not Found",
        "There was an issue with your character. Please contact an administrator."
      );
      await ResponseUtil.smartReply(interaction, { embeds: [embed] });
      return { success: false, error: "No character" };
    }

    // Check payment method availability
    const sourceBalance =
      paymentMethod === "cash" ? balances.cashOnHand : balances.bankBalance;

    if (sourceBalance < cashAmount) {
      // Get current price for calculations
      const currentPrice = await moneyService.getCoinPrice(coin.symbol);
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
        `You need ${BotBranding.formatCurrency(
          cashAmount
        )} but only have ${BotBranding.formatCurrency(
          sourceBalance
        )} in ${paymentMethod}.`
      );

      if (maxBuyAmount >= 10) {
        const maxFee = Math.floor(maxBuyAmount * 0.03);
        const maxNetAmount = maxBuyAmount - maxFee;
        const maxCoinAmount = maxNetAmount / currentPrice;

        embed.addFields({
          name: "💡 Buy Maximum Instead?",
          value: `**Your ${
            paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)
          }:** ${BotBranding.formatCurrency(
            sourceBalance
          )}\n**Current Price:** ${BotBranding.formatCurrency(
            parseFloat(currentPrice.toFixed(2))
          )} per ${coin.symbol}\n**Fee (3%):** ${BotBranding.formatCurrency(
            maxFee
          )}\n**Net Investment:** ${BotBranding.formatCurrency(
            maxNetAmount
          )}\n**You'd Get:** ${maxCoinAmount.toFixed(6)} ${coin.symbol}`,
          inline: false,
        });

        // Create buttons for user choice
        const confirmButton = new ButtonBuilder()
          .setCustomId(`crypto_buy_max_${coin.id}_${paymentMethod}_${userId}`)
          .setLabel(`✅ Buy Max ${coin.symbol}`)
          .setStyle(ButtonStyle.Success);

        const switchButton = new ButtonBuilder()
          .setCustomId(`crypto_buy_switch_${coin.id}_${userId}`)
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
            customId === `crypto_buy_max_${coin.id}_${paymentMethod}_${userId}`
          ) {
            // Execute max purchase
            await buttonInteraction.deferUpdate();

            const result = await moneyService.buyCrypto(
              userId,
              coin.symbol,
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
                value: `**Spent:** ${BotBranding.formatCurrency(
                  maxBuyAmount
                )}\n**Fee:** ${BotBranding.formatCurrency(
                  maxFee
                )} (3%)\n**Net Amount:** ${BotBranding.formatCurrency(
                  maxNetAmount
                )}`,
                inline: true,
              },
              {
                name: `₿ ${coin.symbol} Acquired`,
                value: `**Amount:** ${maxCoinAmount.toFixed(6)} ${
                  coin.symbol
                }\n**Price:** ${BotBranding.formatCurrency(
                  parseFloat(currentPrice.toFixed(2))
                )} per ${coin.symbol}\n**Value:** ${BotBranding.formatCurrency(
                  maxNetAmount
                )}`,
                inline: true,
              },
              {
                name: "💵 Updated Balance",
                value: `**Cash:** ${BotBranding.formatCurrency(
                  paymentMethod === "cash"
                    ? result.data?.fromBalance || 0
                    : balances.cashOnHand
                )}\n**Bank:** ${BotBranding.formatCurrency(
                  paymentMethod === "bank"
                    ? result.data?.fromBalance || 0
                    : balances.bankBalance
                )}`,
                inline: false,
              }
            );

            await buttonInteraction.editReply({
              embeds: [successEmbed],
              components: [],
            });
            return { success: true };
          } else if (customId === `crypto_buy_switch_${coin.id}_${userId}`) {
            // Switch payment method
            await buttonInteraction.deferUpdate();
            const newMethod = paymentMethod === "cash" ? "bank" : "cash";
            const newBalance =
              newMethod === "cash" ? balances.cashOnHand : balances.bankBalance;

            if (newBalance >= cashAmount) {
              // Execute purchase with new method
              const result = await moneyService.buyCrypto(
                userId,
                coin.symbol,
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
                  value: `**Spent:** ${BotBranding.formatCurrency(
                    cashAmount
                  )}\n**Fee:** ${BotBranding.formatCurrency(
                    fee
                  )} (3%)\n**Net Amount:** ${BotBranding.formatCurrency(
                    netAmount
                  )}`,
                  inline: true,
                },
                {
                  name: `₿ ${coin.symbol} Acquired`,
                  value: `**Amount:** ${coinAmount.toFixed(6)} ${
                    coin.symbol
                  }\n**Price:** ${BotBranding.formatCurrency(
                    parseFloat(currentPrice.toFixed(2))
                  )} per ${
                    coin.symbol
                  }\n**Value:** ${BotBranding.formatCurrency(netAmount)}`,
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
                `Not enough ${newMethod} either. You have ${BotBranding.formatCurrency(
                  newBalance
                )} in ${newMethod}.`
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
          value: `• Use \`/crime\` to earn money\n• You need at least ${BotBranding.formatCurrency(
            10
          )} to buy cryptocurrency\n• Check other payment methods if available`,
          inline: false,
        });

        await ResponseUtil.smartReply(interaction, { embeds: [embed] });
      }

      return { success: false, error: "Insufficient funds" };
    }

    // Proceed with normal purchase using optimized money service
    const result = await moneyService.buyCrypto(
      userId,
      coin.symbol, // Use symbol for consistency with existing data
      cashAmount,
      paymentMethod
    );

    if (!result.success) {
      const embed = ResponseUtil.error("Purchase Failed", result.message);
      await ResponseUtil.smartReply(interaction, { embeds: [embed] });
      return { success: false, error: result.error };
    }

    const embed = ResponseUtil.success(
      "✅ Cryptocurrency Purchased",
      `Successfully bought ${coin.name}!`
    );

    const fee = Math.floor(cashAmount * 0.03);
    const netAmount = cashAmount - fee;
    const currentPrice = await moneyService.getCoinPrice(coin.symbol);

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
        }\n**Price:** $${currentPrice.toFixed(2)} per ${
          coin.symbol
        }\n**Value:** $${netAmount.toLocaleString()}`,
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

    await ResponseUtil.smartReply(interaction, { embeds: [embed] });
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
      await ResponseUtil.smartReply(interaction, {
        embeds: [noAccountEmbed],
        flags: 64,
      });
      return { success: false, error: "User not registered" };
    }

    // Defer for heavy operations (database queries, calculations)
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    const coinAmount = interaction.options.getNumber("amount", true);
    const coin = getCryptoCoin();

    // Get current holdings using fast service
    const balance = await MoneyService.getInstance().getUserBalance(userId);
    
    // Check if user has any of this coin - check both ID and symbol for compatibility
    let currentHolding = 0;
    let cryptoKey = "";
    
    if (balance?.cryptoWallet[coin.id]) {
      currentHolding = balance.cryptoWallet[coin.id];
      cryptoKey = coin.id;
    } else if (balance?.cryptoWallet[coin.symbol]) {
      currentHolding = balance.cryptoWallet[coin.symbol];
      cryptoKey = coin.symbol;
    } else {
      // Check if there's any crypto at all (fallback)
      const walletEntries = Object.entries(balance?.cryptoWallet || {});
      if (walletEntries.length > 0) {
        [cryptoKey, currentHolding] = walletEntries[0];
      }
    }

    if (currentHolding === 0) {
      const embed = ResponseUtil.error(
        "❌ No Holdings",
        `You don't own any ${coin.name}. You need to purchase some first before you can sell.`
      );

      embed.addFields({
        name: "💡 Get Started with Crypto Trading",
        value: `• Use \`/crypto prices\` to see current market rates\n• Use \`/crypto buy <amount>\` to purchase ${coin.name}\n• Start with a small amount to test the system`,
        inline: false,
      });

      embed.setFooter({
        text: `💰 ${coin.name} is available for purchase • Check your cash with /wallet`,
      });

      await ResponseUtil.smartReply(interaction, { embeds: [embed] });
      return { success: false, error: "No holdings" };
    }

    if (coinAmount > currentHolding) {
      // Calculate what user would get if they sold their maximum holdings
      const maxCoinAmount = currentHolding;
      const maxPrice = await MoneyService.getInstance().getCoinPrice(cryptoKey);
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
          2
        )}\n**Gross Value:** $${Math.floor(
          maxGrossAmount
        ).toLocaleString()}\n**Fee (4%):** $${maxFee.toLocaleString()}\n**You'd Receive:** $${maxNetCash.toLocaleString()}`,
        inline: false,
      });

      // Create buttons for user choice
      const confirmButton = new ButtonBuilder()
        .setCustomId(`crypto_sell_max_${coin.id}_${userId}`)
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
          buttonInteraction.customId === `crypto_sell_max_${coin.id}_${userId}`
        ) {
          // Execute max sale
          await buttonInteraction.deferUpdate();

          const moneyService = MoneyService.getInstance();
          const maxResult = await moneyService.sellCrypto(
            userId,
            cryptoKey,
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
              }\n**Price:** $${maxPrice.toFixed(2)} per ${
                coin.symbol
              }\n**Gross Value:** $${Math.floor(
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
    const currentPrice = await MoneyService.getInstance().getCoinPrice(cryptoKey);
    const grossAmount = coinAmount * currentPrice;
    const fee = Math.floor(grossAmount * 0.04); // 4% selling fee
    const netCash = grossAmount - fee;

    // Execute the sale using the correct crypto key
    const moneyService = MoneyService.getInstance();
    const result = await moneyService.sellCrypto(userId, cryptoKey, coinAmount);

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
        }\n**Price:** $${currentPrice.toFixed(2)} per ${
          coin.symbol
        }\n**Gross Value:** $${Math.floor(grossAmount).toLocaleString()}`,
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

    await ResponseUtil.smartReply(interaction, { embeds: [embed] });
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
      await ResponseUtil.smartReply(interaction, {
        embeds: [noAccountEmbed],
        flags: 64,
      });
      return { success: false, error: "User not registered" };
    }

    // Defer for heavy operations (database queries, calculations)
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    const moneyService = MoneyService.getInstance();
    const balance = await moneyService.getUserBalance(userId);
    const coin = getCryptoCoin();

    const embed = ResponseUtil.info(
      "₿ Your Cryptocurrency Portfolio",
      `Your ${coin.name} holdings overview`
    );

    if (!balance || Object.keys(balance.cryptoWallet).length === 0) {
      embed.addFields({
        name: "📭 Empty Portfolio",
        value: `You don't own any ${coin.name} yet.\n\n💡 **Get Started:**\n• Use \`/crypto prices\` to see current market price\n• Use \`/crypto buy\` to make your first purchase\n• Start with a small amount to get familiar with the system`,
        inline: false,
      });

      embed.setFooter({
        text: `💰 ${coin.name} (${coin.symbol}) is your gateway to the crypto economy`,
      });
    } else {
      // Check if user has crypto by looking through all wallet entries
      // since crypto might be stored under symbol or ID depending on version
      let cryptoAmount = 0;
      let cryptoKey = "";
      
      // First try the coin ID
      if (balance.cryptoWallet[coin.id]) {
        cryptoAmount = balance.cryptoWallet[coin.id];
        cryptoKey = coin.id;
      }
      // Then try the coin symbol (for legacy/existing data)
      else if (balance.cryptoWallet[coin.symbol]) {
        cryptoAmount = balance.cryptoWallet[coin.symbol];
        cryptoKey = coin.symbol;
      }
      // Finally, check if there's any crypto at all (fallback)
      else {
        const walletEntries = Object.entries(balance.cryptoWallet);
        if (walletEntries.length > 0) {
          [cryptoKey, cryptoAmount] = walletEntries[0];
        }
      }

      if (cryptoAmount === 0) {
        embed.addFields({
          name: "📭 No Cryptocurrency Holdings",
          value: `You don't currently hold any ${coin.name}.\n\n💡 **Get Started:**\n• Use \`/crypto prices\` to see current market price\n• Use \`/crypto buy\` to purchase ${coin.name}\n• Start building your crypto portfolio today`,
          inline: false,
        });
      } else {
        // Get current price and calculate value
        const price = await moneyService.getCoinPrice(cryptoKey);
        const totalValue = cryptoAmount * price;

        // Get price change data
        const db = DatabaseManager.getClient();
        const priceData = await db.cryptoPrice.findUnique({
          where: { coinType: cryptoKey },
        });

        const change24h = priceData?.change24h || 0;
        const changeEmoji = change24h >= 0 ? "📈" : "📉";
        const changeColor = change24h >= 0 ? "+" : "";

        // Portfolio overview
        embed.addFields({
          name: "📊 Portfolio Summary",
          value: `**Total ${coin.symbol} Holdings:** ${cryptoAmount.toFixed(
            6
          )}\n**Current Price:** ${BotBranding.formatCurrency(
            parseFloat(price.toFixed(2))
          )}\n**Total Value:** ${BotBranding.formatCurrency(
            parseFloat(totalValue.toFixed(2))
          )}`,
          inline: false,
        });

        // Detailed holdings
        embed.addFields({
          name: `${changeEmoji} ${coin.name} (${coin.symbol})`,
          value:
            `**Holdings:** ${cryptoAmount.toFixed(6)} ${coin.symbol}\n` +
            `**Price:** ${BotBranding.formatCurrency(
              parseFloat(price.toFixed(2))
            )}\n` +
            `**Value:** ${BotBranding.formatCurrency(
              parseFloat(totalValue.toFixed(2))
            )}\n` +
            `**24h Change:** ${changeColor}${change24h.toFixed(2)}%`,
          inline: false,
        });

        // Performance insights
        const cryptoPercentage = balance.totalValue
          ? (totalValue / balance.totalValue) * 100
          : 0;
        embed.addFields({
          name: "� Portfolio Insights",
          value: `**Crypto % of Net Worth:** ${cryptoPercentage.toFixed(
            1
          )}%\n**Description:** ${coin.description}`,
          inline: false,
        });
      }

      embed.setFooter({
        text: "💡 Use /crypto buy or /crypto sell to manage your holdings • Check /crypto prices for market updates",
      });
    }

    await ResponseUtil.smartReply(interaction, { embeds: [embed] });
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
        .setDescription("View current cryptocurrency market price")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("buy")
        .setDescription("Purchase cryptocurrency with cash or bank funds")
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

      await ResponseUtil.smartReply(interaction, {
        embeds: [embed],
        flags: 64,
      });
      return { success: false, error: "Crypto command failed" };
    }
  },

  cooldown: 3,
  category: "economy",
  description:
    "Complete cryptocurrency trading platform with market prices, buying, selling, and portfolio management",
};

export default cryptoCommand;
