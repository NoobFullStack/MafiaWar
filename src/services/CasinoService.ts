import { EmbedBuilder } from "discord.js";
import { BotBranding } from "../config/bot";
import {
  casinoConfig,
  checkRouletteBet,
  checkSlotWin,
  generateSlotGrid,
  rouletteBets,
  SlotIcon,
  spinRoulette,
  type RouletteNumber,
} from "../data/casino";
import DatabaseManager from "../utils/DatabaseManager";
import { logger } from "../utils/ResponseUtil";
import MoneyService from "./MoneyService";

export interface SlotResult {
  grid: SlotIcon[][];
  isWin: boolean;
  winningLine: SlotIcon[] | null;
  betAmount: number;
  payout: number;
  multiplier: number;
  tier: string;
  profit: number; // payout - betAmount
}

export interface RouletteResult {
  spinResult: RouletteNumber;
  betType: string;
  betNumber: number | string | null;
  betAmount: number;
  isWin: boolean;
  payout: number;
  profit: number; // payout - betAmount
}

export interface CasinoTransactionResult {
  success: boolean;
  message: string;
  error?: string;
  newBalance?: {
    cash: number;
    bank: number;
    total: number;
  };
}

export class CasinoService {
  private static instance: CasinoService;
  private moneyService: MoneyService;

  private constructor() {
    this.moneyService = MoneyService.getInstance();
  }

  public static getInstance(): CasinoService {
    if (!CasinoService.instance) {
      CasinoService.instance = new CasinoService();
    }
    return CasinoService.instance;
  }

  /**
   * Play slots game with specified bet amount
   */
  async playSlots(
    userId: string,
    betAmount: number,
    paymentMethod: "cash" | "bank" = "cash"
  ): Promise<{ result: SlotResult; transaction: CasinoTransactionResult }> {
    try {
      // Validate bet amount
      if (
        betAmount < casinoConfig.slots.minBet ||
        betAmount > casinoConfig.slots.maxBet
      ) {
        return {
          result: this.createEmptySlotResult(betAmount),
          transaction: {
            success: false,
            message: `Bet must be between ${BotBranding.formatCurrency(
              casinoConfig.slots.minBet
            )} and ${BotBranding.formatCurrency(casinoConfig.slots.maxBet)}`,
            error: "Invalid bet amount",
          },
        };
      }

      // Check if user has sufficient funds
      const balance = await this.moneyService.getUserBalance(userId);
      if (!balance) {
        return {
          result: this.createEmptySlotResult(betAmount),
          transaction: {
            success: false,
            message: "Character not found - please create account first",
            error: "No character",
          },
        };
      }

      const availableFunds =
        paymentMethod === "cash" ? balance.cashOnHand : balance.bankBalance;

      if (availableFunds < betAmount) {
        return {
          result: this.createEmptySlotResult(betAmount),
          transaction: {
            success: false,
            message: `Insufficient ${paymentMethod} funds. You need ${BotBranding.formatCurrency(
              betAmount
            )} but only have ${BotBranding.formatCurrency(availableFunds)}`,
            error: "Insufficient funds",
          },
        };
      }

      // Generate slot grid and check for win
      const grid = generateSlotGrid();
      const winCheck = checkSlotWin(grid);

      // Calculate payout
      let payout = 0;
      if (winCheck.isWin) {
        payout = Math.floor(betAmount * winCheck.multiplier);
      }

      const profit = payout - betAmount;

      // Process transaction
      let transactionResult: CasinoTransactionResult;
      if (profit > 0) {
        // Player won - add winnings to cash
        const depositResult = await this.moneyService.addMoney(
          userId,
          profit,
          "cash"
        );
        transactionResult = {
          success: depositResult.success,
          message: depositResult.success
            ? `🎉 You won ${BotBranding.formatCurrency(
                payout
              )}! (Profit: ${BotBranding.formatCurrency(profit)})`
            : `Error processing winnings: ${depositResult.error}`,
          newBalance: depositResult.success
            ? {
                cash: depositResult.newBalance?.cashOnHand || 0,
                bank: depositResult.newBalance?.bankBalance || 0,
                total: depositResult.newBalance?.totalValue || 0,
              }
            : undefined,
        };
      } else {
        // Player lost - deduct bet amount
        const deductResult = await this.deductMoney(
          userId,
          betAmount,
          paymentMethod
        );

        transactionResult = {
          success: deductResult.success,
          message: deductResult.success
            ? `💸 You lost ${BotBranding.formatCurrency(
                betAmount
              )}. Better luck next time!`
            : `Error processing bet: ${deductResult.error}`,
          newBalance: deductResult.success
            ? {
                cash: deductResult.newBalance?.cashOnHand || 0,
                bank: deductResult.newBalance?.bankBalance || 0,
                total: deductResult.newBalance?.totalValue || 0,
              }
            : undefined,
        };
      }

      const result: SlotResult = {
        grid,
        isWin: winCheck.isWin,
        winningLine: winCheck.winningLine,
        betAmount,
        payout,
        multiplier: winCheck.multiplier,
        tier: winCheck.tier,
        profit,
      };

      return { result, transaction: transactionResult };
    } catch (error) {
      logger.error("Error in CasinoService.playSlots:", error);
      return {
        result: this.createEmptySlotResult(betAmount),
        transaction: {
          success: false,
          message: "An error occurred while processing your slots game",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  /**
   * Play roulette with specified bet
   */
  async playRoulette(
    userId: string,
    betType: string,
    betAmount: number,
    betNumber: number | string | null = null,
    paymentMethod: "cash" | "bank" = "cash"
  ): Promise<{ result: RouletteResult; transaction: CasinoTransactionResult }> {
    try {
      // Validate bet amount
      if (
        betAmount < casinoConfig.roulette.minBet ||
        betAmount > casinoConfig.roulette.maxBet
      ) {
        return {
          result: this.createEmptyRouletteResult(betType, betNumber, betAmount),
          transaction: {
            success: false,
            message: `Bet must be between ${BotBranding.formatCurrency(
              casinoConfig.roulette.minBet
            )} and ${BotBranding.formatCurrency(casinoConfig.roulette.maxBet)}`,
            error: "Invalid bet amount",
          },
        };
      }

      // Validate bet type
      const validBet = rouletteBets.find((b) => b.type === betType);
      if (!validBet) {
        return {
          result: this.createEmptyRouletteResult(betType, betNumber, betAmount),
          transaction: {
            success: false,
            message: `Invalid bet type: ${betType}`,
            error: "Invalid bet type",
          },
        };
      }

      // Validate number for straight bets
      if (betType === "straight") {
        if (
          betNumber === null ||
          (betNumber !== "00" &&
            (typeof betNumber === "string" || betNumber < 0 || betNumber > 36))
        ) {
          return {
            result: this.createEmptyRouletteResult(
              betType,
              betNumber,
              betAmount
            ),
            transaction: {
              success: false,
              message:
                "For straight bets, please specify a number (0, 00, or 1-36)",
              error: "Invalid number for straight bet",
            },
          };
        }
      }

      // Check if user has sufficient funds
      const balance = await this.moneyService.getUserBalance(userId);
      if (!balance) {
        return {
          result: this.createEmptyRouletteResult(betType, betNumber, betAmount),
          transaction: {
            success: false,
            message: "Character not found - please create account first",
            error: "No character",
          },
        };
      }

      const availableFunds =
        paymentMethod === "cash" ? balance.cashOnHand : balance.bankBalance;

      if (availableFunds < betAmount) {
        return {
          result: this.createEmptyRouletteResult(betType, betNumber, betAmount),
          transaction: {
            success: false,
            message: `Insufficient ${paymentMethod} funds. You need ${BotBranding.formatCurrency(
              betAmount
            )} but only have ${BotBranding.formatCurrency(availableFunds)}`,
            error: "Insufficient funds",
          },
        };
      }

      // Spin the roulette
      const spinResult = spinRoulette();
      const betCheck = checkRouletteBet(betType, betNumber, spinResult);

      // Calculate payout
      let payout = 0;
      if (betCheck.isWin) {
        payout = betAmount + betAmount * betCheck.payout;
      }

      const profit = payout - betAmount;

      // Process transaction
      let transactionResult: CasinoTransactionResult;
      if (profit > 0) {
        // Player won - add winnings to cash
        const depositResult = await this.moneyService.addMoney(
          userId,
          profit,
          "cash"
        );
        transactionResult = {
          success: depositResult.success,
          message: depositResult.success
            ? `🎉 You won ${BotBranding.formatCurrency(
                payout
              )}! (Profit: ${BotBranding.formatCurrency(profit)})`
            : `Error processing winnings: ${depositResult.error}`,
          newBalance: depositResult.success
            ? {
                cash: depositResult.newBalance?.cashOnHand || 0,
                bank: depositResult.newBalance?.bankBalance || 0,
                total: depositResult.newBalance?.totalValue || 0,
              }
            : undefined,
        };
      } else {
        // Player lost - deduct bet amount
        const deductResult = await this.deductMoney(
          userId,
          betAmount,
          paymentMethod
        );

        transactionResult = {
          success: deductResult.success,
          message: deductResult.success
            ? `💸 You lost ${BotBranding.formatCurrency(
                betAmount
              )}. The house wins this time!`
            : `Error processing bet: ${deductResult.error}`,
          newBalance: deductResult.success
            ? {
                cash: deductResult.newBalance?.cashOnHand || 0,
                bank: deductResult.newBalance?.bankBalance || 0,
                total: deductResult.newBalance?.totalValue || 0,
              }
            : undefined,
        };
      }

      const result: RouletteResult = {
        spinResult,
        betType,
        betNumber,
        betAmount,
        isWin: betCheck.isWin,
        payout,
        profit,
      };

      // Log to audit table for analysis
      try {
        const user = await DatabaseManager.getUserForAuth(userId);
        if (user) {
          const db = DatabaseManager.getClient();
          await db.rouletteAudit.create({
            data: {
              userId: user.id,
              discordId: user.discordId,
              username: user.username,
              betType,
              betNumber: betNumber?.toString() || null,
              betAmount,
              paymentMethod,
              spinNumber: spinResult.number.toString(),
              spinColor: spinResult.color,
              isWin: betCheck.isWin,
              payout,
              profit,
            },
          });
        }
      } catch (auditError) {
        // Don't fail the whole transaction if audit logging fails
        logger.error("Error logging roulette result to audit:", auditError);
      }

      return { result, transaction: transactionResult };
    } catch (error) {
      logger.error("Error in CasinoService.playRoulette:", error);
      return {
        result: this.createEmptyRouletteResult(betType, betNumber, betAmount),
        transaction: {
          success: false,
          message: "An error occurred while processing your roulette game",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  /**
   * Create visual representation of slot grid for Discord embed
   */
  createSlotsEmbed(result: SlotResult, userTag: string): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(result.isWin ? 0x00ff00 : 0xff0000) // Green for win, red for loss
      .setTitle("🎰 Slot Machine")
      .setAuthor({
        name: userTag,
        iconURL: `https://cdn.discordapp.com/embed/avatars/0.png`,
      });

    // Create visual grid
    let gridDisplay = "```\n";
    gridDisplay += "┌─────┬─────┬─────┐\n";

    for (let row = 0; row < result.grid.length; row++) {
      gridDisplay += "│";
      for (let col = 0; col < result.grid[row].length; col++) {
        const icon = result.grid[row][col];
        gridDisplay += ` ${icon.emoji}  │`;
      }
      gridDisplay += row === 1 && result.isWin ? " ← WIN!" : "";
      gridDisplay += "\n";

      if (row < result.grid.length - 1) {
        gridDisplay += "├─────┼─────┼─────┤\n";
      }
    }

    gridDisplay += "└─────┴─────┴─────┘\n```";

    embed.addFields(
      {
        name: "🎲 Slot Result",
        value: gridDisplay,
        inline: false,
      },
      {
        name: "💰 Bet Information",
        value: `**Bet Amount:** ${BotBranding.formatCurrency(
          result.betAmount
        )}\n**Result:** ${result.isWin ? "🎉 **WIN!**" : "💸 **LOSE**"}`,
        inline: true,
      }
    );

    if (result.isWin && result.winningLine) {
      const winningIcons = result.winningLine
        .map((icon) => `${icon.emoji} ${icon.name}`)
        .join(" • ");
      embed.addFields({
        name: "🏆 Winning Line",
        value: `${winningIcons}\n**Multiplier:** ${
          result.multiplier
        }x\n**Payout:** ${BotBranding.formatCurrency(
          result.payout
        )}\n**Profit:** ${BotBranding.formatCurrency(result.profit)}`,
        inline: true,
      });
    }

    // Add payout table
    embed.addFields({
      name: "📊 Payout Table",
      value: `🤵 Legendary: 75x 💥\n💣 Epic: 12-15x\n👑 Rare: 3.5-5x\n💎 Uncommon: 1.5-2.5x\n💵 Common: 0.7-1.2x`,
      inline: false,
    });

    embed.setFooter({
      text: `${BotBranding.getName()} • When losing; increase the stakes`,
    });

    return embed;
  }

  /**
   * Create visual representation of roulette result for Discord embed
   */
  createRouletteEmbed(result: RouletteResult, userTag: string): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(result.isWin ? 0x00ff00 : 0xff0000) // Green for win, red for loss
      .setTitle("🎡 Roulette Wheel")
      .setAuthor({
        name: userTag,
        iconURL: `https://cdn.discordapp.com/embed/avatars/0.png`,
      });

    // Get color emoji for the result
    const colorEmoji =
      result.spinResult.color === "red"
        ? "🔴"
        : result.spinResult.color === "black"
        ? "⚫"
        : "🟢";

    embed.addFields(
      {
        name: "🎲 Spin Result",
        value: `**${colorEmoji} ${
          result.spinResult.number
        }**\n*${result.spinResult.color.toUpperCase()}*`,
        inline: true,
      },
      {
        name: "🎯 Your Bet",
        value: this.formatRouletteBet(
          result.betType,
          result.betNumber,
          result.betAmount
        ),
        inline: true,
      },
      {
        name: "💰 Result",
        value: `**${result.isWin ? "🎉 WIN!" : "💸 LOSE"}**\n${
          result.isWin
            ? `Payout: ${BotBranding.formatCurrency(
                result.payout
              )}\nProfit: ${BotBranding.formatCurrency(result.profit)}`
            : `Lost: ${BotBranding.formatCurrency(result.betAmount)}`
        }`,
        inline: true,
      }
    );

    // Add betting options reference
    embed.addFields({
      name: "🎰 Betting Options",
      value: `**Even Money (1:1):** Red, Black, Even, Odd, 1-18, 19-36\n**Dozens (2:1):** 1st/2nd/3rd Dozen\n**Straight (35:1):** Single number`,
      inline: false,
    });

    embed.setFooter({
      text: `${BotBranding.getName()} • When losing; increase the stakes`,
    });

    return embed;
  }

  /**
   * Get casino statistics and configuration info
   */
  getCasinoInfo(): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(BotBranding.getThemeColor())
      .setTitle("🎰 Casino Information")
      .setDescription(
        "Welcome to the underground casino! Test your luck with our games."
      );

    embed.addFields(
      {
        name: "🎲 Slots",
        value: `**Min Bet:** ${BotBranding.formatCurrency(
          casinoConfig.slots.minBet
        )}\n**Max Bet:** ${BotBranding.formatCurrency(
          casinoConfig.slots.maxBet
        )}\n**How to Play:** Three matching symbols in the middle row wins!\n**House Edge:** ${(
          casinoConfig.slots.houseEdge * 100
        ).toFixed(1)}%\n🎰 *High win frequency with exciting jackpots!*`,
        inline: true,
      },
      {
        name: "🎡 Roulette",
        value: `**Min Bet:** ${BotBranding.formatCurrency(
          casinoConfig.roulette.minBet
        )}\n**Max Bet:** ${BotBranding.formatCurrency(
          casinoConfig.roulette.maxBet
        )}\n**How to Play:** Bet on numbers (0, 00, 1-36), colors, or ranges\n**House Edge:** ${(
          casinoConfig.roulette.houseEdge * 100
        ).toFixed(2)}%`,
        inline: true,
      }
    );

    embed.addFields({
      name: "💡 Pro Tips",
      value:
        "• Start with small bets to learn the games\n• Set a budget and stick to it\n• Remember: the house always has an edge\n• Cash out your winnings regularly",
      inline: false,
    });

    embed.setFooter({
      text: `${BotBranding.getName()} • Gamble Responsibly`,
    });

    return embed;
  }

  private createEmptySlotResult(betAmount: number): SlotResult {
    return {
      grid: [[]],
      isWin: false,
      winningLine: null,
      betAmount,
      payout: 0,
      multiplier: 0,
      tier: "error",
      profit: -betAmount,
    };
  }

  private createEmptyRouletteResult(
    betType: string,
    betNumber: number | string | null,
    betAmount: number
  ): RouletteResult {
    return {
      spinResult: { number: 0, color: "green", parity: null, range: null },
      betType,
      betNumber,
      betAmount,
      isWin: false,
      payout: 0,
      profit: -betAmount,
    };
  }

  private formatRouletteBet(
    betType: string,
    betNumber: number | string | null,
    betAmount: number
  ): string {
    let betDescription = "";

    switch (betType) {
      case "straight":
        betDescription = `Number ${betNumber}`;
        break;
      case "red":
        betDescription = "🔴 Red";
        break;
      case "black":
        betDescription = "⚫ Black";
        break;
      case "even":
        betDescription = "Even";
        break;
      case "odd":
        betDescription = "Odd";
        break;
      case "low":
        betDescription = "1-18";
        break;
      case "high":
        betDescription = "19-36";
        break;
      case "dozen1":
        betDescription = "1st Dozen (1-12)";
        break;
      case "dozen2":
        betDescription = "2nd Dozen (13-24)";
        break;
      case "dozen3":
        betDescription = "3rd Dozen (25-36)";
        break;
      default:
        betDescription = betType;
    }

    return `**${betDescription}**\nBet: ${BotBranding.formatCurrency(
      betAmount
    )}`;
  }

  /**
   * Deduct money from user account for casino losses
   */
  private async deductMoney(
    userId: string,
    amount: number,
    paymentMethod: "cash" | "bank"
  ): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    newBalance?: {
      cashOnHand: number;
      bankBalance: number;
      totalValue: number;
    };
  }> {
    try {
      // Input validation
      if (!userId || typeof userId !== "string") {
        return {
          success: false,
          error: "Invalid user ID",
        };
      }

      if (!amount || amount <= 0 || !Number.isInteger(amount)) {
        return {
          success: false,
          error: "Amount must be a positive integer",
        };
      }

      // Get user and character
      const user = await DatabaseManager.getUserForAuth(userId);
      if (!user || !user.character) {
        return {
          success: false,
          error: "Character not found",
        };
      }

      const character = user.character;

      // Check if user has sufficient funds
      const availableFunds =
        paymentMethod === "cash" ? character.cashOnHand : character.bankBalance;
      if (availableFunds < amount) {
        return {
          success: false,
          error: `Insufficient ${paymentMethod} funds`,
        };
      }

      // Prepare update data
      const updateData: any = {};
      if (paymentMethod === "cash") {
        updateData.cashOnHand = character.cashOnHand - amount;
      } else {
        updateData.bankBalance = character.bankBalance - amount;
      }

      // Update character balance
      const db = DatabaseManager.getClient();
      await db.character.updateMany({
        where: { userId: user.id },
        data: updateData,
      });

      // Calculate new balances
      const newCashOnHand =
        paymentMethod === "cash"
          ? character.cashOnHand - amount
          : character.cashOnHand;
      const newBankBalance =
        paymentMethod === "bank"
          ? character.bankBalance - amount
          : character.bankBalance;
      const newTotalValue = newCashOnHand + newBankBalance;

      return {
        success: true,
        message: `Deducted ${BotBranding.formatCurrency(
          amount
        )} from ${paymentMethod}`,
        newBalance: {
          cashOnHand: newCashOnHand,
          bankBalance: newBankBalance,
          totalValue: newTotalValue,
        },
      };
    } catch (error) {
      logger.error("Error deducting money for casino loss:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get the last N roulette results for audit/analysis
   */
  async getLastRouletteResults(limit: number = 10): Promise<any[]> {
    try {
      const db = DatabaseManager.getClient();
      const results = await db.rouletteAudit.findMany({
        orderBy: { timestamp: "desc" },
        take: limit,
        select: {
          id: true,
          username: true,
          betType: true,
          betNumber: true,
          betAmount: true,
          spinNumber: true,
          spinColor: true,
          isWin: true,
          payout: true,
          profit: true,
          timestamp: true,
        },
      });

      return results;
    } catch (error) {
      logger.error("Error fetching roulette audit results:", error);
      return [];
    }
  }

  /**
   * Create player-friendly embed for displaying recent roulette results
   */
  createRouletteAuditEmbed(results: any[]): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(BotBranding.getThemeColor())
      .setTitle("🎡 Recent Roulette Spins")
      .setDescription(
        `🎲 **Last ${results.length} results** • See what numbers are hot!`
      );

    if (results.length === 0) {
      embed.addFields({
        name: "📭 No Results",
        value: "No roulette games have been played yet. Be the first to spin!",
        inline: false,
      });
      return embed;
    }

    // Count occurrences of each number for quick analysis
    const numberCounts: { [key: string]: number } = {};
    const colorCounts = { red: 0, black: 0, green: 0 };
    let totalWins = 0;

    results.forEach((result) => {
      numberCounts[result.spinNumber] =
        (numberCounts[result.spinNumber] || 0) + 1;
      colorCounts[result.spinColor as keyof typeof colorCounts]++;
      if (result.isWin) totalWins++;
    });

    // Create simplified results display
    let resultsText = "```\n";
    resultsText += "#  | Number | Result\n";
    resultsText += "---|--------|-------\n";

    results.forEach((result, index) => {
      const colorEmoji =
        result.spinColor === "red"
          ? "🔴"
          : result.spinColor === "black"
          ? "⚫"
          : "🟢";
      const winStatus = result.isWin ? "WIN" : "---";

      resultsText += `${String(index + 1).padStart(2)} | ${colorEmoji} ${String(
        result.spinNumber
      ).padEnd(4)} | ${winStatus}\n`;
    });
    resultsText += "```";

    embed.addFields({
      name: "🎲 Spin History",
      value: resultsText,
      inline: false,
    });

    // Enhanced analysis section
    const frequentNumbers = Object.entries(numberCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)
      .map(([num, count]) => {
        const percentage = ((count / results.length) * 100).toFixed(1);
        return `**${num}**: ${count}x (${percentage}%)`;
      })
      .join(" • ");

    const winRate = ((totalWins / results.length) * 100).toFixed(1);

    embed.addFields({
      name: "📈 Statistical Overview",
      value: `**Colors:** 🔴 ${colorCounts.red} • ⚫ ${colorCounts.black} • 🟢 ${colorCounts.green}\n**Player Win Rate:** ${winRate}% (${totalWins}/${results.length} spins)`,
      inline: false,
    });

    if (frequentNumbers) {
      embed.addFields({
        name: "🔥 Hot Numbers",
        value: frequentNumbers,
        inline: false,
      });
    }

    embed.setFooter({
      text: `${BotBranding.getName()} Casino • Good luck on your next spin! 🍀`,
    });

    return embed;
  }
}

export default CasinoService;
