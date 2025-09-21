import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import CasinoService from "../../src/services/CasinoService";

// Load environment variables
config();

const prisma = new PrismaClient();

// Helper function to clean crypto wallet of unsupported coins
async function cleanCryptoWallet(discordId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { discordId },
      include: { character: true },
    });

    if (user?.character) {
      const cryptoWallet = user.character.cryptoWallet as any;
      if (cryptoWallet && typeof cryptoWallet === 'object') {
        // Remove bitcoin and other unsupported coins, keep only NXS/crypto
        const cleanWallet: any = {};
        if (cryptoWallet.crypto) cleanWallet.crypto = cryptoWallet.crypto;
        if (cryptoWallet.NXS) cleanWallet.NXS = cryptoWallet.NXS;
        
        await prisma.character.update({
          where: { id: user.character.id },
          data: { cryptoWallet: cleanWallet },
        });
        
        console.log("🧹 Cleaned crypto wallet of unsupported coins");
      }
    }
  } catch (error) {
    console.log("⚠️  Could not clean crypto wallet:", (error as Error).message);
  }
}

// Comprehensive roulette statistics analysis
function analyzeRouletteResults(results: any[]) {
  if (results.length === 0) {
    console.log("No data to analyze");
    return;
  }

  console.log(`\n📊 COMPREHENSIVE ROULETTE ANALYSIS (${results.length} spins)`);
  console.log("═".repeat(60));

  // Color analysis
  const redCount = results.filter(r => r.spinColor === "red").length;
  const blackCount = results.filter(r => r.spinColor === "black").length;
  const greenCount = results.filter(r => r.spinColor === "green").length;
  
  console.log("\n🎨 COLOR DISTRIBUTION:");
  console.log(`🔴 Red:   ${redCount.toString().padStart(3)} (${(redCount/results.length*100).toFixed(1)}%) - Expected: 47.4%`);
  console.log(`⚫ Black: ${blackCount.toString().padStart(3)} (${(blackCount/results.length*100).toFixed(1)}%) - Expected: 47.4%`);
  console.log(`🟢 Green: ${greenCount.toString().padStart(3)} (${(greenCount/results.length*100).toFixed(1)}%) - Expected: 5.3%`);

  // Even/Odd analysis
  const evenNumbers = results.filter(r => {
    const num = parseInt(r.spinNumber);
    return !isNaN(num) && num > 0 && num % 2 === 0;
  }).length;
  const oddNumbers = results.filter(r => {
    const num = parseInt(r.spinNumber);
    return !isNaN(num) && num > 0 && num % 2 === 1;
  }).length;
  
  console.log("\n🔢 EVEN/ODD DISTRIBUTION:");
  console.log(`Even: ${evenNumbers.toString().padStart(3)} (${(evenNumbers/results.length*100).toFixed(1)}%) - Expected: 47.4%`);
  console.log(`Odd:  ${oddNumbers.toString().padStart(3)} (${(oddNumbers/results.length*100).toFixed(1)}%) - Expected: 47.4%`);

  // Range analysis (1-18, 19-36)
  const lowNumbers = results.filter(r => {
    const num = parseInt(r.spinNumber);
    return !isNaN(num) && num >= 1 && num <= 18;
  }).length;
  const highNumbers = results.filter(r => {
    const num = parseInt(r.spinNumber);
    return !isNaN(num) && num >= 19 && num <= 36;
  }).length;
  
  console.log("\n📏 RANGE DISTRIBUTION:");
  console.log(`Low (1-18):  ${lowNumbers.toString().padStart(3)} (${(lowNumbers/results.length*100).toFixed(1)}%) - Expected: 47.4%`);
  console.log(`High (19-36): ${highNumbers.toString().padStart(3)} (${(highNumbers/results.length*100).toFixed(1)}%) - Expected: 47.4%`);

  // Special numbers analysis
  const zeroCount = results.filter(r => r.spinNumber === "0").length;
  const doubleZeroCount = results.filter(r => r.spinNumber === "00").length;
  
  console.log("\n🎯 SPECIAL NUMBERS:");
  console.log(`0:  ${zeroCount.toString().padStart(3)} (${(zeroCount/results.length*100).toFixed(1)}%) - Expected: 2.6%`);
  console.log(`00: ${doubleZeroCount.toString().padStart(3)} (${(doubleZeroCount/results.length*100).toFixed(1)}%) - Expected: 2.6%`);

  // Hot and cold numbers
  const numberFreq: { [key: string]: number } = {};
  results.forEach(r => {
    numberFreq[r.spinNumber] = (numberFreq[r.spinNumber] || 0) + 1;
  });

  const sortedNumbers = Object.entries(numberFreq)
    .sort(([,a], [,b]) => b - a);

  console.log("\n🔥 HOT NUMBERS (Top 5):");
  sortedNumbers.slice(0, 5).forEach(([num, count], index) => {
    const percentage = (count / results.length * 100).toFixed(1);
    console.log(`${index + 1}. ${num.padStart(2)}: ${count.toString().padStart(2)} times (${percentage}%)`);
  });

  console.log("\n❄️  COLD NUMBERS (Bottom 5):");
  sortedNumbers.slice(-5).reverse().forEach(([num, count], index) => {
    const percentage = (count / results.length * 100).toFixed(1);
    console.log(`${index + 1}. ${num.padStart(2)}: ${count.toString().padStart(2)} times (${percentage}%)`);
  });

  // Win rate analysis
  const totalWins = results.filter(r => r.isWin).length;
  const totalProfit = results.reduce((sum, r) => sum + r.profit, 0);
  
  console.log("\n💰 FINANCIAL ANALYSIS:");
  console.log(`Win Rate: ${(totalWins/results.length*100).toFixed(1)}%`);
  console.log(`Total Profit/Loss: $${totalProfit >= 0 ? '+' : ''}${totalProfit.toLocaleString()}`);
  console.log(`Average per spin: $${(totalProfit/results.length).toFixed(2)}`);

  // Bias warnings
  console.log("\n⚠️  BIAS ALERTS:");
  let biasFound = false;
  
  if (doubleZeroCount / results.length > 0.05) {
    console.log(`🚨 00 appearing unusually high: ${(doubleZeroCount/results.length*100).toFixed(1)}% (Expected: 2.6%)`);
    biasFound = true;
  }
  
  if (Math.abs(redCount - blackCount) / results.length > 0.15) {
    console.log(`🚨 Significant red/black imbalance detected`);
    biasFound = true;
  }
  
  if (!biasFound) {
    console.log("✅ No significant biases detected");
  }
}

async function testRouletteAudit() {
  try {
    console.log("🧪 Testing Roulette Audit & Statistics System...\n");

    // Use the debug Discord ID from environment or command line
    const testDiscordId = process.argv[2] || process.env.DEBUG_DISCORD_ID;

    if (!testDiscordId) {
      console.log("Usage: ts-node testRouletteAudit.ts [discordId]");
      console.log(
        "Will use DEBUG_DISCORD_ID from .env if no argument provided"
      );
      console.log("Example: ts-node testRouletteAudit.ts 123456789012345678");
      process.exit(1);
    }

    console.log(`🎯 Testing with Discord ID: ${testDiscordId}`);

    // Clean crypto wallet first to avoid Bitcoin errors
    await cleanCryptoWallet(testDiscordId);

    const user = await prisma.user.findUnique({
      where: { discordId: testDiscordId },
      include: { character: true },
    });

    if (!user || !user.character) {
      console.log("❌ User or character not found!");
      console.log(
        "Make sure the Discord ID is correct and the user has a character."
      );
      process.exit(1);
    }

    console.log(`Found user: ${user.username} (${user.character.name})`);
    console.log(
      `Current balance: $${user.character.cashOnHand.toLocaleString()}\n`
    );

    const casinoService = CasinoService.getInstance();

    // Test multiple roulette spins to generate audit data
    console.log("🎲 Simulating roulette spins...");

    const bets = [
      { type: "red", amount: 100 },
      { type: "black", amount: 50 },
      { type: "straight", amount: 25, number: "00" },
      { type: "even", amount: 75 },
      { type: "straight", amount: 20, number: 7 },
      { type: "odd", amount: 60 },
      { type: "high", amount: 40 },
      { type: "low", amount: 30 },
    ];

    for (let i = 0; i < bets.length; i++) {
      const bet = bets[i];
      console.log(
        `Spin ${i + 1}: Betting $${bet.amount} on ${bet.type}${
          bet.number ? ` (${bet.number})` : ""
        }`
      );

      const { result, transaction } = await casinoService.playRoulette(
        testDiscordId,
        bet.type,
        bet.amount,
        bet.number || null,
        "cash"
      );

      if (transaction.success) {
        const winStatus = result.isWin ? "WON" : "LOST";
        const colorEmoji =
          result.spinResult.color === "red"
            ? "🔴"
            : result.spinResult.color === "black"
            ? "⚫"
            : "🟢";

        console.log(
          `  → Result: ${colorEmoji} ${result.spinResult.number} | ${winStatus} | Profit: $${result.profit >= 0 ? '+' : ''}${result.profit}`
        );
      } else {
        console.log(`  → Error: ${transaction.message}`);
        break;
      }

      // Small delay to make timestamps more distinct
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log("\n📊 Retrieving audit data for analysis...");

    // Get larger sample for better statistical analysis
    const auditResults = await casinoService.getLastRouletteResults(50);
    console.log(`Retrieved ${auditResults.length} audit records`);

    if (auditResults.length > 0) {
      console.log("\n📋 RECENT RESULTS (Last 10):");
      auditResults.slice(0, 10).forEach((result, index) => {
        const colorEmoji =
          result.spinColor === "red"
            ? "🔴"
            : result.spinColor === "black"
            ? "⚫"
            : "🟢";
        const winStatus = result.isWin ? "✅" : "❌";
        console.log(
          `  ${(index + 1).toString().padStart(2)}. ${colorEmoji} ${result.spinNumber.toString().padStart(2)} | ${winStatus} | ${result.username} | $${
            result.profit >= 0 ? "+" : ""
          }${result.profit}`
        );
      });

      // Comprehensive statistical analysis
      analyzeRouletteResults(auditResults);
    }

    console.log("\n✅ Roulette audit and statistics test completed successfully!");
  } catch (error) {
    console.error("❌ Error testing roulette audit:", error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

testRouletteAudit();
