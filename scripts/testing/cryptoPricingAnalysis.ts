/**
 * Comprehensive Crypto Pricing Algorithm Analysis
 *
 * This tool provides detailed mathematical analysis of crypto pricing algorithms,
 * comparing the old biased implementation with the new symmetric multiplicative approach.
 * It includes statistical analysis, convergence testing, and distribution analysis.
 */

interface SimulationResult {
  algorithm: string;
  iterations: number;
  trials: number;
  startPrice: number;
  endPrice: number;
  percentageChange: number;
  averagePrice: number;
  geometricMean: number;
  theoreticalGeometricMean: number;
  bias: number;
  variance: number;
  standardDeviation: number;
  priceDistribution: {
    below50percent: number;
    between50and200percent: number;
    above200percent: number;
    extremeGains: number; // Above 1000%
    extremeLosses: number; // Below -90%
  };
  percentileData: {
    p5: number;
    p25: number;
    p50: number; // median
    p75: number;
    p95: number;
  };
}

interface AlgorithmComparison {
  old: SimulationResult;
  new: SimulationResult;
  improvementMetrics: {
    biasReduction: number;
    varianceChange: number;
    extremeMovementReduction: number;
  };
}

/**
 * Calculate geometric mean of price ratios
 */
function calculateGeometricMean(prices: number[]): number {
  if (prices.length < 2) return 1.0;

  let logSum = 0;
  for (let i = 1; i < prices.length; i++) {
    const ratio = prices[i] / prices[i - 1];
    if (ratio > 0) {
      logSum += Math.log(ratio);
    }
  }

  return Math.exp(logSum / (prices.length - 1));
}

/**
 * Calculate percentiles from sorted array
 */
function calculatePercentiles(sortedValues: number[]): {
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
} {
  const n = sortedValues.length;
  return {
    p5: sortedValues[Math.floor(0.05 * n)],
    p25: sortedValues[Math.floor(0.25 * n)],
    p50: sortedValues[Math.floor(0.5 * n)],
    p75: sortedValues[Math.floor(0.75 * n)],
    p95: sortedValues[Math.floor(0.95 * n)],
  };
}

/**
 * Analyze price distribution
 */
function analyzePriceDistribution(finalPrices: number[], startPrice: number) {
  const total = finalPrices.length;

  const below50 = finalPrices.filter((p) => p < startPrice * 0.5).length;
  const between50and200 = finalPrices.filter(
    (p) => p >= startPrice * 0.5 && p <= startPrice * 2
  ).length;
  const above200 = finalPrices.filter((p) => p > startPrice * 2).length;
  const extremeGains = finalPrices.filter((p) => p > startPrice * 10).length; // 1000%+ gains
  const extremeLosses = finalPrices.filter((p) => p < startPrice * 0.1).length; // 90%+ losses

  return {
    below50percent: (below50 / total) * 100,
    between50and200percent: (between50and200 / total) * 100,
    above200percent: (above200 / total) * 100,
    extremeGains: (extremeGains / total) * 100,
    extremeLosses: (extremeLosses / total) * 100,
  };
}

/**
 * OLD Algorithm - Original biased implementation from MoneyService.ts
 */
function simulateOldAlgorithm(
  startPrice: number,
  volatility: number,
  iterations: number
): number[] {
  const prices: number[] = [startPrice];
  let currentPrice = startPrice;

  for (let i = 0; i < iterations; i++) {
    // Original biased algorithm: (Math.random() - 0.5) * 2 * volatility
    const change = (Math.random() - 0.5) * 2 * volatility;
    currentPrice = Math.max(currentPrice * (1 + change), 0.01);
    prices.push(currentPrice);
  }

  return prices;
}

/**
 * NEW Algorithm - Fixed symmetric multiplicative implementation from MoneyService.ts
 */
function simulateNewAlgorithm(
  startPrice: number,
  volatility: number,
  iterations: number
): number[] {
  const prices: number[] = [startPrice];
  let currentPrice = startPrice;

  for (let i = 0; i < iterations; i++) {
    // Current implementation in MoneyService.ts:
    const isUp = Math.random() < 0.5;
    const changeAmount = Math.random() * volatility; // 0 to volatility
    const multiplier = isUp ? 1 + changeAmount : 1 / (1 + changeAmount);
    currentPrice = Math.max(currentPrice * multiplier, 0.01);
    prices.push(currentPrice);
  }

  return prices;
}

/**
 * Run comprehensive analysis for a single algorithm
 */
function runAnalysis(
  algorithm: "old" | "new",
  startPrice: number,
  volatility: number,
  iterations: number,
  trials: number
): SimulationResult {
  const allResults: number[] = [];
  const allPriceHistories: number[][] = [];

  // Run simulations
  for (let i = 0; i < trials; i++) {
    const prices =
      algorithm === "old"
        ? simulateOldAlgorithm(startPrice, volatility, iterations)
        : simulateNewAlgorithm(startPrice, volatility, iterations);

    allPriceHistories.push(prices);
    const endPrice = prices[prices.length - 1];
    const percentChange = ((endPrice - startPrice) / startPrice) * 100;
    allResults.push(percentChange);
  }

  // Calculate statistics
  const sortedResults = [...allResults].sort((a, b) => a - b);
  const finalPrices = allPriceHistories.map(
    (prices) => prices[prices.length - 1]
  );
  const geometricMeans = allPriceHistories.map((prices) =>
    calculateGeometricMean(prices)
  );

  const avgPercentChange =
    allResults.reduce((sum, val) => sum + val, 0) / trials;
  const avgGeometricMean =
    geometricMeans.reduce((sum, val) => sum + val, 0) / trials;
  const variance =
    allResults.reduce(
      (sum, val) => sum + Math.pow(val - avgPercentChange, 2),
      0
    ) / trials;
  const standardDeviation = Math.sqrt(variance);

  // Calculate theoretical geometric mean
  let theoreticalGM = 1.0;
  if (algorithm === "old") {
    // For uniform distribution in multiplicative process: E[log(1+X)] ≈ -σ²/6 for small σ
    const expectedLogChange = -(volatility * volatility) / 6;
    theoreticalGM = Math.exp(expectedLogChange);
  } else {
    // For symmetric multiplicative: E[log(multiplier)] = 0, so GM should be 1.0
    theoreticalGM = 1.0;
  }

  const bias = ((avgGeometricMean - theoreticalGM) / theoreticalGM) * 100;
  const priceDistribution = analyzePriceDistribution(finalPrices, startPrice);
  const percentileData = calculatePercentiles(sortedResults);

  return {
    algorithm: algorithm === "old" ? "Old (Biased)" : "New (Symmetric)",
    iterations,
    trials,
    startPrice,
    endPrice:
      finalPrices.reduce((sum, val) => sum + val, 0) / finalPrices.length,
    percentageChange: avgPercentChange,
    averagePrice:
      allPriceHistories.flat().reduce((sum, val) => sum + val, 0) /
      allPriceHistories.flat().length,
    geometricMean: avgGeometricMean,
    theoreticalGeometricMean: theoreticalGM,
    bias,
    variance,
    standardDeviation,
    priceDistribution,
    percentileData,
  };
}

/**
 * Compare both algorithms
 */
function compareAlgorithms(
  startPrice: number,
  volatility: number,
  iterations: number,
  trials: number
): AlgorithmComparison {
  const oldResult = runAnalysis(
    "old",
    startPrice,
    volatility,
    iterations,
    trials
  );
  const newResult = runAnalysis(
    "new",
    startPrice,
    volatility,
    iterations,
    trials
  );

  const biasReduction = oldResult.bias - newResult.bias;
  const varianceChange =
    ((newResult.variance - oldResult.variance) / oldResult.variance) * 100;
  const extremeMovementReduction =
    oldResult.priceDistribution.extremeLosses -
    newResult.priceDistribution.extremeLosses;

  return {
    old: oldResult,
    new: newResult,
    improvementMetrics: {
      biasReduction,
      varianceChange,
      extremeMovementReduction,
    },
  };
}

/**
 * Test convergence across different sample sizes
 */
function testConvergence(
  algorithm: "old" | "new",
  startPrice: number,
  volatility: number,
  iterations: number
): SimulationResult[] {
  const trialCounts = [100, 500, 1000, 2500, 5000, 10000];
  return trialCounts.map((trials) =>
    runAnalysis(algorithm, startPrice, volatility, iterations, trials)
  );
}

/**
 * Test across different time horizons
 */
function testTimeHorizons(
  algorithm: "old" | "new",
  startPrice: number,
  volatility: number,
  trials: number
): SimulationResult[] {
  const iterationCounts = [10, 24, 168, 720, 8760]; // 10 updates, daily, weekly, monthly, yearly
  return iterationCounts.map((iterations) =>
    runAnalysis(algorithm, startPrice, volatility, iterations, trials)
  );
}

/**
 * Display formatted results
 */
function displayResults(
  results: SimulationResult | AlgorithmComparison | SimulationResult[],
  title: string
): void {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`${title.toUpperCase()}`);
  console.log(`${"=".repeat(80)}`);

  if (Array.isArray(results)) {
    // Multiple results (convergence or time horizon tests)
    results.forEach((result) => {
      console.log(
        `\n${result.algorithm} (${result.trials} trials, ${result.iterations} iterations):`
      );
      console.log(
        `  Geometric Mean: ${result.geometricMean.toFixed(
          6
        )} (theoretical: ${result.theoreticalGeometricMean.toFixed(6)})`
      );
      console.log(`  Bias: ${result.bias.toFixed(3)}%`);
      console.log(`  Std Dev: ${result.standardDeviation.toFixed(2)}%`);
      console.log(
        `  Extreme Losses (>90%): ${result.priceDistribution.extremeLosses.toFixed(
          1
        )}%`
      );
      console.log(
        `  Percentiles: [${result.percentileData.p5.toFixed(
          1
        )}, ${result.percentileData.p25.toFixed(
          1
        )}, ${result.percentileData.p50.toFixed(
          1
        )}, ${result.percentileData.p75.toFixed(
          1
        )}, ${result.percentileData.p95.toFixed(1)}]%`
      );
    });
  } else if ("old" in results && "new" in results) {
    // Comparison results
    const comp = results as AlgorithmComparison;

    [comp.old, comp.new].forEach((result) => {
      console.log(`\n${result.algorithm}:`);
      console.log(
        `  Trials: ${result.trials.toLocaleString()}, Iterations: ${
          result.iterations
        }`
      );
      console.log(
        `  Geometric Mean: ${result.geometricMean.toFixed(
          6
        )} (theoretical: ${result.theoreticalGeometricMean.toFixed(6)})`
      );
      console.log(`  Bias: ${result.bias.toFixed(3)}%`);
      console.log(`  Average Change: ${result.percentageChange.toFixed(2)}%`);
      console.log(
        `  Standard Deviation: ${result.standardDeviation.toFixed(2)}%`
      );
      console.log(`  Variance: ${result.variance.toFixed(0)}`);

      console.log(`  Price Distribution:`);
      console.log(
        `    Below 50%: ${result.priceDistribution.below50percent.toFixed(1)}%`
      );
      console.log(
        `    50%-200%: ${result.priceDistribution.between50and200percent.toFixed(
          1
        )}%`
      );
      console.log(
        `    Above 200%: ${result.priceDistribution.above200percent.toFixed(
          1
        )}%`
      );
      console.log(
        `    Extreme Gains (>1000%): ${result.priceDistribution.extremeGains.toFixed(
          1
        )}%`
      );
      console.log(
        `    Extreme Losses (>90%): ${result.priceDistribution.extremeLosses.toFixed(
          1
        )}%`
      );

      console.log(
        `  Percentiles (5th, 25th, 50th, 75th, 95th): [${result.percentileData.p5.toFixed(
          1
        )}, ${result.percentileData.p25.toFixed(
          1
        )}, ${result.percentileData.p50.toFixed(
          1
        )}, ${result.percentileData.p75.toFixed(
          1
        )}, ${result.percentileData.p95.toFixed(1)}]%`
      );
    });

    console.log(`\nIMPROVEMENT METRICS:`);
    console.log(
      `  Bias Reduction: ${comp.improvementMetrics.biasReduction.toFixed(3)}%`
    );
    console.log(
      `  Variance Change: ${comp.improvementMetrics.varianceChange.toFixed(1)}%`
    );
    console.log(
      `  Extreme Loss Reduction: ${comp.improvementMetrics.extremeMovementReduction.toFixed(
        1
      )}%`
    );
  } else {
    // Single result
    const result = results as SimulationResult;
    console.log(`\n${result.algorithm}:`);
    console.log(
      `  Trials: ${result.trials.toLocaleString()}, Iterations: ${
        result.iterations
      }`
    );
    console.log(
      `  Start Price: $${
        result.startPrice
      }, End Price: $${result.endPrice.toFixed(2)}`
    );
    console.log(`  Average Change: ${result.percentageChange.toFixed(2)}%`);
    console.log(
      `  Geometric Mean: ${result.geometricMean.toFixed(
        6
      )} (theoretical: ${result.theoreticalGeometricMean.toFixed(6)})`
    );
    console.log(`  Bias: ${result.bias.toFixed(3)}%`);
    console.log(
      `  Standard Deviation: ${result.standardDeviation.toFixed(2)}%`
    );
    console.log(
      `  Price Distribution: [<50%: ${result.priceDistribution.below50percent.toFixed(
        1
      )}%, 50-200%: ${result.priceDistribution.between50and200percent.toFixed(
        1
      )}%, >200%: ${result.priceDistribution.above200percent.toFixed(1)}%]`
    );
  }
}

/**
 * Main analysis function
 */
async function main(): Promise<void> {
  console.log("🧮 Comprehensive Crypto Pricing Algorithm Analysis");
  console.log(
    "Mathematical analysis of pricing algorithms used in MoneyService.ts\n"
  );

  // Configuration matching MoneyService.ts
  const config = {
    startPrice: 1337, // MafiaWar crypto base price
    volatility: 0.35, // 35% volatility from getCryptoCoin()
    weeklyIterations: 168, // Hourly updates for a week
    monthlyIterations: 720, // Hourly updates for a month
    standardTrials: 1000, // Standard sample size
    largeTrials: 10000, // Large sample for convergence
  };

  console.log(`Configuration (from MoneyService.ts):`);
  console.log(`  Start Price: $${config.startPrice}`);
  console.log(`  Volatility: ${(config.volatility * 100).toFixed(0)}%`);
  console.log(`  Price Floor: $0.01`);

  // Test 1: Algorithm Comparison (Weekly Simulation)
  const weeklyComparison = compareAlgorithms(
    config.startPrice,
    config.volatility,
    config.weeklyIterations,
    config.standardTrials
  );
  displayResults(
    weeklyComparison,
    "Weekly Algorithm Comparison (168 hourly updates)"
  );

  // Test 2: Monthly Comparison
  const monthlyComparison = compareAlgorithms(
    config.startPrice,
    config.volatility,
    config.monthlyIterations,
    config.standardTrials
  );
  displayResults(
    monthlyComparison,
    "Monthly Algorithm Comparison (720 hourly updates)"
  );

  // Test 3: Convergence Analysis for New Algorithm
  const newConvergence = testConvergence(
    "new",
    config.startPrice,
    config.volatility,
    config.weeklyIterations
  );
  displayResults(newConvergence, "New Algorithm Convergence Analysis");

  // Test 4: Time Horizon Analysis for New Algorithm
  const newTimeHorizons = testTimeHorizons(
    "new",
    config.startPrice,
    config.volatility,
    config.standardTrials
  );
  displayResults(newTimeHorizons, "New Algorithm Time Horizon Analysis");

  // Test 5: High-Frequency Analysis (simulating very active trading)
  const highFreqComparison = compareAlgorithms(
    config.startPrice,
    config.volatility,
    1000, // 1000 price updates
    config.standardTrials
  );
  displayResults(
    highFreqComparison,
    "High-Frequency Trading Simulation (1000 updates)"
  );

  // Mathematical Summary
  console.log(`\n${"=".repeat(80)}`);
  console.log(`MATHEMATICAL ANALYSIS SUMMARY`);
  console.log(`${"=".repeat(80)}`);

  const weeklyNew = weeklyComparison.new;
  const monthlyNew = monthlyComparison.new;

  console.log(`\nNew Algorithm Performance:`);
  console.log(
    `  Mathematical Bias: ${
      Math.abs(weeklyNew.bias) < 0.1 ? "NEGLIGIBLE" : "PRESENT"
    } (${weeklyNew.bias.toFixed(3)}%)`
  );
  console.log(
    `  Price Stability: ${weeklyNew.standardDeviation.toFixed(
      1
    )}% standard deviation`
  );
  console.log(
    `  Extreme Risk: ${weeklyNew.priceDistribution.extremeLosses.toFixed(
      1
    )}% chance of >90% loss`
  );
  console.log(
    `  Extreme Opportunity: ${weeklyNew.priceDistribution.extremeGains.toFixed(
      1
    )}% chance of >1000% gain`
  );

  console.log(`\nComparison vs Old Algorithm:`);
  console.log(
    `  Bias Improvement: ${weeklyComparison.improvementMetrics.biasReduction.toFixed(
      3
    )}% reduction`
  );
  console.log(
    `  Risk Reduction: ${weeklyComparison.improvementMetrics.extremeMovementReduction.toFixed(
      1
    )}% fewer extreme losses`
  );

  console.log(`\nTime Horizon Effects:`);
  console.log(`  Weekly (168h): ${weeklyNew.bias.toFixed(3)}% bias`);
  console.log(`  Monthly (720h): ${monthlyNew.bias.toFixed(3)}% bias`);

  const geometric = weeklyNew.geometricMean;
  const theoretical = weeklyNew.theoreticalGeometricMean;
  const deviation = Math.abs(geometric - theoretical);

  console.log(`\nGeometric Mean Analysis:`);
  console.log(`  Actual: ${geometric.toFixed(6)}`);
  console.log(`  Theoretical: ${theoretical.toFixed(6)}`);
  console.log(
    `  Deviation: ${deviation.toFixed(6)} (${(
      (deviation / theoretical) *
      100
    ).toFixed(3)}%)`
  );
  console.log(
    `  Status: ${
      deviation < 0.001 ? "✅ MATHEMATICALLY SOUND" : "⚠️  NEEDS ADJUSTMENT"
    }`
  );
}

// Export functions for use in other modules
export {
  compareAlgorithms,
  displayResults,
  runAnalysis,
  main as runComprehensiveAnalysis,
  simulateNewAlgorithm,
  simulateOldAlgorithm,
  testConvergence,
  testTimeHorizons,
};

// Run analysis if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Analysis failed:", error);
    process.exit(1);
  });
}
