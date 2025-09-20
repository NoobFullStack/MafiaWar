import { SlashCommandBuilder } from "discord.js";
import CasinoService from "../services/CasinoService";
import JailService from "../services/JailService";
import { Command, CommandContext, CommandResult } from "../types/command";
import DatabaseManager from "../utils/DatabaseManager";
import { ResponseUtil, logger } from "../utils/ResponseUtil";

const casinoCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("casino")
    .setDescription("Try your luck at the underground casino")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("info")
        .setDescription("View casino information and game rules")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("slots")
        .setDescription("Play the slot machine")
        .addIntegerOption((option) =>
          option
            .setName("bet")
            .setDescription("Amount to bet")
            .setRequired(true)
            .setMinValue(10)
            .setMaxValue(10000)
        )
        .addStringOption((option) =>
          option
            .setName("payment")
            .setDescription("Payment method")
            .setRequired(false)
            .addChoices(
              { name: "Cash", value: "cash" },
              { name: "Bank", value: "bank" }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("roulette")
        .setDescription("Play roulette")
        .addStringOption((option) =>
          option
            .setName("bet_type")
            .setDescription("Type of bet to place")
            .setRequired(true)
            .addChoices(
              { name: "Red", value: "red" },
              { name: "Black", value: "black" },
              { name: "Even", value: "even" },
              { name: "Odd", value: "odd" },
              { name: "Low (1-18)", value: "low" },
              { name: "High (19-36)", value: "high" },
              { name: "1st Dozen (1-12)", value: "dozen1" },
              { name: "2nd Dozen (13-24)", value: "dozen2" },
              { name: "3rd Dozen (25-36)", value: "dozen3" },
              { name: "Straight (Single Number)", value: "straight" }
            )
        )
        .addIntegerOption((option) =>
          option
            .setName("bet_amount")
            .setDescription("Amount to bet")
            .setRequired(true)
            .setMinValue(5)
            .setMaxValue(50000)
        )
        .addStringOption((option) =>
          option
            .setName("number")
            .setDescription(
              "Number to bet on (0, 00, 1-36 for straight bets only)"
            )
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName("payment")
            .setDescription("Payment method")
            .setRequired(false)
            .addChoices(
              { name: "Cash", value: "cash" },
              { name: "Bank", value: "bank" }
            )
        )
    ),

  async execute(context: CommandContext): Promise<CommandResult> {
    const { interaction, userId, userTag } = context;
    const subcommand = interaction.options.getSubcommand();

    try {
      // Handle info command immediately without deferring (it's fast)
      if (subcommand === "info") {
        const casinoService = CasinoService.getInstance();
        const infoEmbed = casinoService.getCasinoInfo();
        await interaction.editReply({ embeds: [infoEmbed] });
        return { success: true, message: "Casino info displayed" };
      }

      // For gambling commands, check auth and jail (reply is already deferred by bot.ts)
      const user = await DatabaseManager.getUserForAuth(userId);
      if (!user) {
        const noAccountEmbed = ResponseUtil.noAccount(userTag);
        await interaction.editReply({ embeds: [noAccountEmbed] });
        return { success: false, error: "User not registered" };
      }

      // Check if player is in jail (blocks casino activities)
      const jailCheck = await JailService.checkJailBlocking(userId, "casino");
      if (jailCheck.blocked) {
        const embed = ResponseUtil.error(
          "🚔 Casino Access Blocked",
          jailCheck.reason || "You can't access the casino while in jail!"
        );
        await interaction.editReply({ embeds: [embed] });
        return { success: false, error: "Player is in jail" };
      }

      const casinoService = CasinoService.getInstance();

      switch (subcommand) {
        case "slots": {
          const betAmount = interaction.options.getInteger("bet", true);
          const paymentMethod =
            (interaction.options.getString("payment") as "cash" | "bank") ||
            "cash";

          const { result, transaction } = await casinoService.playSlots(
            userId,
            betAmount,
            paymentMethod
          );

          if (!transaction.success) {
            const errorEmbed = ResponseUtil.error(
              "🎰 Slots Error",
              transaction.message
            );
            await interaction.editReply({ embeds: [errorEmbed] });
            return { success: false, error: transaction.error };
          }

          const slotsEmbed = casinoService.createSlotsEmbed(result, userTag);

          // Use editReply since slots is deferred as public
          await interaction.editReply({ embeds: [slotsEmbed] });
          return {
            success: true,
            message: result.isWin
              ? `Won $${result.payout.toLocaleString()}!`
              : `Lost $${result.betAmount.toLocaleString()}`,
          };
        }

        case "roulette": {
          const betType = interaction.options.getString("bet_type", true);
          const betAmount = interaction.options.getInteger("bet_amount", true);
          const betNumberString = interaction.options.getString("number");
          const paymentMethod =
            (interaction.options.getString("payment") as "cash" | "bank") ||
            "cash";

          // Parse and validate bet number for straight bets
          let betNumber: number | string | null = null;
          if (betType === "straight") {
            if (!betNumberString) {
              const errorEmbed = ResponseUtil.error(
                "🎡 Roulette Error",
                "You must specify a number (0, 00, 1-36) for straight bets"
              );
              await interaction.editReply({ embeds: [errorEmbed] });
              return {
                success: false,
                error: "Missing number for straight bet",
              };
            }

            if (betNumberString === "00") {
              betNumber = "00";
            } else {
              const parsedNumber = parseInt(betNumberString);
              if (
                isNaN(parsedNumber) ||
                parsedNumber < 0 ||
                parsedNumber > 36
              ) {
                const errorEmbed = ResponseUtil.error(
                  "🎡 Roulette Error",
                  "Number must be 0, 00, or 1-36"
                );
                await interaction.editReply({ embeds: [errorEmbed] });
                return {
                  success: false,
                  error: "Invalid number for straight bet",
                };
              }
              betNumber = parsedNumber;
            }
          }

          const { result, transaction } = await casinoService.playRoulette(
            userId,
            betType,
            betAmount,
            betNumber,
            paymentMethod
          );

          if (!transaction.success) {
            const errorEmbed = ResponseUtil.error(
              "🎡 Roulette Error",
              transaction.message
            );
            await interaction.editReply({ embeds: [errorEmbed] });
            return { success: false, error: transaction.error };
          }

          const rouletteEmbed = casinoService.createRouletteEmbed(
            result,
            userTag
          );

          // Use editReply since roulette is deferred as public
          await interaction.editReply({ embeds: [rouletteEmbed] });
          return {
            success: true,
            message: result.isWin
              ? `Won $${result.payout.toLocaleString()}!`
              : `Lost $${result.betAmount.toLocaleString()}`,
          };
        }

        default:
          const errorEmbed = ResponseUtil.error(
            "Invalid Command",
            "Unknown casino subcommand"
          );
          await interaction.editReply({ embeds: [errorEmbed] });
          return { success: false, error: "Invalid subcommand" };
      }
    } catch (error) {
      logger.error("Error in casino command:", error);
      const errorEmbed = ResponseUtil.error(
        "Casino Error",
        "An unexpected error occurred. Please try again later."
      );

      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  cooldown: 5, // 5 second cooldown between casino games
  category: "casino",
  description:
    "Underground casino with slots and roulette games for high-risk gambling",
};

export default casinoCommand;
