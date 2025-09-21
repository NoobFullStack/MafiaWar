import { config } from "dotenv";
import { spinRoulette } from "../../src/data/casino";

// Load environment variables
config();

// Comprehensive roulette distribution analysis
function analyzeSpinDistribution(spins: any[]) {
  if (spins.length === 0) {
    console.log("No data to analyze");
    return;
  }

  console.log(
    `\n📊 ROULETTE SPIN DISTRIBUTION ANALYSIS (${spins.length.toLocaleString()} spins)`
  );
  console.log("═".repeat(80));

  // Color analysis
  const redCount = spins.filter((s) => s.color === "red").length;
  const blackCount = spins.filter((s) => s.color === "black").length;
  const greenCount = spins.filter((s) => s.color === "green").length;

  console.log("\n🎨 COLOR DISTRIBUTION:");
  console.log(
    `🔴 Red:   ${redCount.toString().padStart(5)} (${(
      (redCount / spins.length) *
      100
    ).toFixed(2)}%) - Expected: 47.37% (18/38)`
  );
  console.log(
    `⚫ Black: ${blackCount.toString().padStart(5)} (${(
      (blackCount / spins.length) *
      100
    ).toFixed(2)}%) - Expected: 47.37% (18/38)`
  );
  console.log(
    `🟢 Green: ${greenCount.toString().padStart(5)} (${(
      (greenCount / spins.length) *
      100
    ).toFixed(2)}%) - Expected:  5.26% (2/38)`
  );

  // Even/Odd analysis (excluding 0 and 00)
  const evenNumbers = spins.filter((s) => {
    const num = typeof s.number === "number" ? s.number : parseInt(s.number);
    return !isNaN(num) && num > 0 && num % 2 === 0;
  }).length;
  const oddNumbers = spins.filter((s) => {
    const num = typeof s.number === "number" ? s.number : parseInt(s.number);
    return !isNaN(num) && num > 0 && num % 2 === 1;
  }).length;

  console.log("\n🔢 EVEN/ODD DISTRIBUTION:");
  console.log(
    `Even: ${evenNumbers.toString().padStart(5)} (${(
      (evenNumbers / spins.length) *
      100
    ).toFixed(2)}%) - Expected: 47.37% (18/38)`
  );
  console.log(
    `Odd:  ${oddNumbers.toString().padStart(5)} (${(
      (oddNumbers / spins.length) *
      100
    ).toFixed(2)}%) - Expected: 47.37% (18/38)`
  );

  // Range analysis (1-18, 19-36)
  const lowNumbers = spins.filter((s) => {
    const num = typeof s.number === "number" ? s.number : parseInt(s.number);
    return !isNaN(num) && num >= 1 && num <= 18;
  }).length;
  const highNumbers = spins.filter((s) => {
    const num = typeof s.number === "number" ? s.number : parseInt(s.number);
    return !isNaN(num) && num >= 19 && num <= 36;
  }).length;

  console.log("\n📏 RANGE DISTRIBUTION:");
  console.log(
    `Low (1-18):   ${lowNumbers.toString().padStart(5)} (${(
      (lowNumbers / spins.length) *
      100
    ).toFixed(2)}%) - Expected: 47.37% (18/38)`
  );
  console.log(
    `High (19-36): ${highNumbers.toString().padStart(5)} (${(
      (highNumbers / spins.length) *
      100
    ).toFixed(2)}%) - Expected: 47.37% (18/38)`
  );

  // Special numbers analysis
  const zeroCount = spins.filter((s) => s.number === 0).length;
  const doubleZeroCount = spins.filter((s) => s.number === "00").length;

  console.log("\n🎯 SPECIAL NUMBERS:");
  console.log(
    `0:  ${zeroCount.toString().padStart(5)} (${(
      (zeroCount / spins.length) *
      100
    ).toFixed(2)}%) - Expected: 2.63% (1/38)`
  );
  console.log(
    `00: ${doubleZeroCount.toString().padStart(5)} (${(
      (doubleZeroCount / spins.length) *
      100
    ).toFixed(2)}%) - Expected: 2.63% (1/38)`
  );

  // Individual number frequency
  const numberFreq: { [key: string]: number } = {};
  spins.forEach((s) => {
    const numStr = s.number.toString();
    numberFreq[numStr] = (numberFreq[numStr] || 0) + 1;
  });

  const sortedNumbers = Object.entries(numberFreq).sort(
    ([, a], [, b]) => b - a
  );

  console.log("\n🔥 HOT NUMBERS (Top 10):");
  sortedNumbers.slice(0, 10).forEach(([num, count], index) => {
    const percentage = ((count / spins.length) * 100).toFixed(2);
    const expected = (100 / 38).toFixed(2);
    console.log(
      `${(index + 1).toString().padStart(2)}. ${num.padStart(2)}: ${count
        .toString()
        .padStart(4)} times (${percentage}%) - Expected: ${expected}%`
    );
  });

  console.log("\n❄️  COLD NUMBERS (Bottom 10):");
  sortedNumbers
    .slice(-10)
    .reverse()
    .forEach(([num, count], index) => {
      const percentage = ((count / spins.length) * 100).toFixed(2);
      const expected = (100 / 38).toFixed(2);
      console.log(
        `${(index + 1).toString().padStart(2)}. ${num.padStart(2)}: ${count
          .toString()
          .padStart(4)} times (${percentage}%) - Expected: ${expected}%`
      );
    });

  // Dozen analysis
  const dozen1 = spins.filter((s) => {
    const num = typeof s.number === "number" ? s.number : parseInt(s.number);
    return !isNaN(num) && num >= 1 && num <= 12;
  }).length;
  const dozen2 = spins.filter((s) => {
    const num = typeof s.number === "number" ? s.number : parseInt(s.number);
    return !isNaN(num) && num >= 13 && num <= 24;
  }).length;
  const dozen3 = spins.filter((s) => {
    const num = typeof s.number === "number" ? s.number : parseInt(s.number);
    return !isNaN(num) && num >= 25 && num <= 36;
  }).length;

  console.log("\n� DOZEN DISTRIBUTION:");
  console.log(
    `1st Dozen (1-12):  ${dozen1.toString().padStart(5)} (${(
      (dozen1 / spins.length) *
      100
    ).toFixed(2)}%) - Expected: 31.58% (12/38)`
  );
  console.log(
    `2nd Dozen (13-24): ${dozen2.toString().padStart(5)} (${(
      (dozen2 / spins.length) *
      100
    ).toFixed(2)}%) - Expected: 31.58% (12/38)`
  );
  console.log(
    `3rd Dozen (25-36): ${dozen3.toString().padStart(5)} (${(
      (dozen3 / spins.length) *
      100
    ).toFixed(2)}%) - Expected: 31.58% (12/38)`
  );

  // Statistical variance analysis
  console.log("\n📈 STATISTICAL ANALYSIS:");

  // Chi-square test approximation for color distribution
  const expectedColorCount = (spins.length * 18) / 38; // Expected red or black
  const expectedGreenCount = (spins.length * 2) / 38; // Expected green

  const redVariance =
    Math.pow(redCount - expectedColorCount, 2) / expectedColorCount;
  const blackVariance =
    Math.pow(blackCount - expectedColorCount, 2) / expectedColorCount;
  const greenVariance =
    Math.pow(greenCount - expectedGreenCount, 2) / expectedGreenCount;
  const colorChiSquare = redVariance + blackVariance + greenVariance;

  console.log(
    `Color Chi-Square: ${colorChiSquare.toFixed(
      2
    )} (lower is better, <7.815 for 95% confidence)`
  );

  // Individual number variance
  const expectedPerNumber = spins.length / 38;
  let numberChiSquare = 0;
  Object.values(numberFreq).forEach((count) => {
    numberChiSquare +=
      Math.pow(count - expectedPerNumber, 2) / expectedPerNumber;
  });

  console.log(
    `Number Chi-Square: ${numberChiSquare.toFixed(
      2
    )} (critical value ~52.19 for 37 degrees of freedom)`
  );

  // Bias warnings
  console.log("\n⚠️  BIAS ALERTS:");
  let biasFound = false;

  // Check for color bias
  const colorDeviation = Math.abs(redCount - blackCount) / spins.length;
  if (colorDeviation > 0.05) {
    console.log(
      `🚨 Significant red/black imbalance: ${(colorDeviation * 100).toFixed(
        2
      )}% deviation`
    );
    biasFound = true;
  }

  // Check for green bias
  const greenDeviation =
    Math.abs(greenCount - expectedGreenCount) / spins.length;
  if (greenDeviation > 0.02) {
    console.log(
      `🚨 Green number bias detected: ${(greenDeviation * 100).toFixed(
        2
      )}% deviation from expected`
    );
    biasFound = true;
  }

  // Check for hot number bias
  const maxCount = Math.max(...Object.values(numberFreq));
  const maxDeviation = (maxCount - expectedPerNumber) / expectedPerNumber;
  if (maxDeviation > 0.5) {
    const hotNumber = Object.entries(numberFreq).find(
      ([, count]) => count === maxCount
    )?.[0];
    console.log(
      `🚨 Hot number detected: ${hotNumber} appears ${(
        (maxDeviation + 1) *
        100
      ).toFixed(1)}% more than expected`
    );
    biasFound = true;
  }

  if (!biasFound) {
    console.log(
      "✅ No significant biases detected - randomness appears healthy"
    );
  }

  // Streaks analysis
  console.log("\n🔄 STREAK ANALYSIS:");
  let longestRedStreak = 0;
  let longestBlackStreak = 0;
  let longestEvenStreak = 0;
  let longestOddStreak = 0;

  let currentRedStreak = 0;
  let currentBlackStreak = 0;
  let currentEvenStreak = 0;
  let currentOddStreak = 0;

  spins.forEach((spin) => {
    // Color streaks
    if (spin.color === "red") {
      currentRedStreak++;
      currentBlackStreak = 0;
      longestRedStreak = Math.max(longestRedStreak, currentRedStreak);
    } else if (spin.color === "black") {
      currentBlackStreak++;
      currentRedStreak = 0;
      longestBlackStreak = Math.max(longestBlackStreak, currentBlackStreak);
    } else {
      currentRedStreak = 0;
      currentBlackStreak = 0;
    }

    // Even/Odd streaks
    const num =
      typeof spin.number === "number" ? spin.number : parseInt(spin.number);
    if (!isNaN(num) && num > 0) {
      if (num % 2 === 0) {
        currentEvenStreak++;
        currentOddStreak = 0;
        longestEvenStreak = Math.max(longestEvenStreak, currentEvenStreak);
      } else {
        currentOddStreak++;
        currentEvenStreak = 0;
        longestOddStreak = Math.max(longestOddStreak, currentOddStreak);
      }
    } else {
      currentEvenStreak = 0;
      currentOddStreak = 0;
    }
  });

  console.log(`Longest Red Streak:   ${longestRedStreak}`);
  console.log(`Longest Black Streak: ${longestBlackStreak}`);
  console.log(`Longest Even Streak:  ${longestEvenStreak}`);
  console.log(`Longest Odd Streak:   ${longestOddStreak}`);
}

async function testRouletteDistribution() {
  try {
    console.log("🧪 Testing Roulette Number Distribution...\n");

    const totalSpins = 10000;
    console.log(
      `🎲 Generating ${totalSpins.toLocaleString()} roulette spins for distribution analysis...`
    );

    const spins: any[] = [];

    for (let i = 0; i < totalSpins; i++) {
      if (i % 1000 === 0) {
        console.log(
          `  Progress: ${i.toLocaleString()}/${totalSpins.toLocaleString()} spins (${(
            (i / totalSpins) *
            100
          ).toFixed(1)}%)`
        );
      }

      const result = spinRoulette();
      spins.push(result);

      // Log first few spins for verification
      if (i < 10) {
        const colorEmoji =
          result.color === "red"
            ? "🔴"
            : result.color === "black"
            ? "⚫"
            : "🟢";
        console.log(`Spin ${i + 1}: ${colorEmoji} ${result.number}`);
      }
    }

    console.log(`\n✅ Generated ${spins.length.toLocaleString()} spins\n`);

    // Analyze the distribution
    analyzeSpinDistribution(spins);

    console.log("\n✅ Roulette distribution analysis completed successfully!");
  } catch (error) {
    console.error("❌ Error testing roulette distribution:", error);
  }
}

testRouletteDistribution();
