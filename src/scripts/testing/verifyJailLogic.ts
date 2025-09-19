/**
 * Verification script for jail system logic
 * Tests the core logic without requiring database access
 */

// Import only the static methods we need to test
function formatJailTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  } else {
    const days = Math.floor(minutes / 1440);
    const remainingHours = Math.floor((minutes % 1440) / 60);
    const remainingMinutes = minutes % 60;
    
    let formatted = `${days}d`;
    if (remainingHours > 0) formatted += ` ${remainingHours}h`;
    if (remainingMinutes > 0) formatted += ` ${remainingMinutes}m`;
    
    return formatted;
  }
}

function calculateBribeAmount(
  crimeSeverity: number, 
  playerWealth: number, 
  timeLeftMinutes: number
): number {
  // Base bribe starts at $1000 per severity point
  let baseBribe = crimeSeverity * 1000;

  // Wealth factor: Police know about visible money (cash + bank)
  // Higher wealth = higher bribes (corrupt police want more)
  const wealthMultiplier = Math.min(3, 1 + (playerWealth / 100000)); // Max 3x multiplier at $100k+
  baseBribe = Math.floor(baseBribe * wealthMultiplier);

  // Time factor: Longer sentences are more expensive to escape
  const timeMultiplier = Math.min(2, 1 + (timeLeftMinutes / 1440)); // Max 2x at 24+ hours
  baseBribe = Math.floor(baseBribe * timeMultiplier);

  // Add some randomness (±20%) to prevent predictability
  const randomFactor = 0.8 + (Math.random() * 0.4);
  baseBribe = Math.floor(baseBribe * randomFactor);

  // Minimum bribe amount
  return Math.max(500, baseBribe);
}

function testJailSystemLogic() {
  console.log("🧪 Testing jail system logic...");

  // Test formatJailTime function
  console.log("\n1. Testing formatJailTime function:");
  const testTimes = [5, 65, 150, 1500];
  testTimes.forEach(minutes => {
    const formatted = formatJailTime(minutes);
    console.log(`  ${minutes} minutes -> "${formatted}"`);
  });

  // Test calculateBribeAmount function
  console.log("\n2. Testing calculateBribeAmount function:");
  const testCases = [
    { severity: 1, wealth: 1000, time: 30 },
    { severity: 5, wealth: 50000, time: 120 },
    { severity: 10, wealth: 100000, time: 1440 }
  ];
  
  testCases.forEach((testCase, index) => {
    const bribe = calculateBribeAmount(testCase.severity, testCase.wealth, testCase.time);
    console.log(`  Test ${index + 1}: Severity=${testCase.severity}, Wealth=$${testCase.wealth}, Time=${testCase.time}min -> Bribe=$${bribe}`);
  });

  // Test consistency of bribe calculations (same inputs should give similar results)
  console.log("\n3. Testing bribe calculation consistency:");
  const severity = 5;
  const wealth = 25000;
  const time = 60;
  
  const bribes = [];
  for (let i = 0; i < 5; i++) {
    bribes.push(calculateBribeAmount(severity, wealth, time));
  }
  
  console.log(`  Same inputs (severity=${severity}, wealth=$${wealth}, time=${time}min):`);
  bribes.forEach((bribe, index) => {
    console.log(`    Run ${index + 1}: $${bribe}`);
  });
  
  const minBribe = Math.min(...bribes);
  const maxBribe = Math.max(...bribes);
  const variance = ((maxBribe - minBribe) / minBribe * 100).toFixed(1);
  console.log(`  Variance: ${variance}% (${minBribe} - ${maxBribe})`);

  console.log("\n✅ Jail system logic tests completed!");
}

// Run the tests
testJailSystemLogic();