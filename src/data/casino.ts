export interface SlotIcon {
  id: string;
  name: string;
  emoji: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  multiplier: number; // Payout multiplier when middle line matches
  weight: number; // Weight for random selection (higher = more common)
}

export interface SlotPayoutTier {
  tier: string;
  description: string;
  multiplier: number;
  probability: number; // Approximate probability as decimal
}

export interface RouletteNumber {
  number: number | string; // Allow string for "00"
  color: "red" | "black" | "green";
  parity: "even" | "odd" | null; // null for 0 and 00
  range: "low" | "high" | null; // low: 1-18, high: 19-36, null for 0 and 00
}

export interface CasinoConfig {
  slots: {
    minBet: number;
    maxBet: number;
    gridSize: { rows: number; cols: number };
    houseEdge: number; // Percentage as decimal (e.g., 0.05 = 5%)
  };
  roulette: {
    minBet: number;
    maxBet: number;
    houseEdge: number;
  };
}

// Slot machine icons with mafia/crime theme
export const slotIcons: SlotIcon[] = [
  // High frequency, mixed payout icons (70% chance) - Balance of small losses and wins
  {
    id: "cash",
    name: "Cash",
    emoji: "💵",
    rarity: "common",
    multiplier: 0.8, // Pay 80% of bet - small loss but feels like a win
    weight: 150,
  },
  {
    id: "gun",
    name: "Gun",
    emoji: "🔫",
    rarity: "common",
    multiplier: 1.1, // Small actual win
    weight: 140,
  },
  {
    id: "car",
    name: "Car",
    emoji: "🚗",
    rarity: "common",
    multiplier: 0.9, // Pay 90% of bet - minor loss
    weight: 130,
  },
  {
    id: "briefcase",
    name: "Briefcase",
    emoji: "💼",
    rarity: "common",
    multiplier: 1.2, // Decent small win
    weight: 120,
  },
  {
    id: "phone",
    name: "Phone",
    emoji: "📱",
    rarity: "common",
    multiplier: 0.7, // Pay 70% of bet
    weight: 110,
  },
  {
    id: "cigarette",
    name: "Cigarette",
    emoji: "🚬",
    rarity: "common",
    multiplier: 1.0, // Break even
    weight: 100,
  },

  // Good win icons (20% chance)
  {
    id: "diamond",
    name: "Diamond",
    emoji: "💎",
    rarity: "uncommon",
    multiplier: 2.0, // Double money
    weight: 50,
  },
  {
    id: "gold",
    name: "Gold Bar",
    emoji: "🏆",
    rarity: "uncommon",
    multiplier: 1.8, // Nice win
    weight: 45,
  },
  {
    id: "casino",
    name: "Casino",
    emoji: "🎰",
    rarity: "uncommon",
    multiplier: 2.5, // Great win
    weight: 40,
  },
  {
    id: "gem",
    name: "Gem",
    emoji: "💍",
    rarity: "uncommon",
    multiplier: 1.5, // Solid win
    weight: 35,
  },

  // Rare icons (8% chance) - Exciting wins
  {
    id: "crown",
    name: "Crown",
    emoji: "👑",
    rarity: "rare",
    multiplier: 4.0, // 4x win
    weight: 20,
  },
  {
    id: "skull",
    name: "Skull",
    emoji: "💀",
    rarity: "rare",
    multiplier: 3.5, // 3.5x win
    weight: 18,
  },
  {
    id: "trophy",
    name: "Trophy",
    emoji: "🏅",
    rarity: "rare",
    multiplier: 5.0, // 5x win
    weight: 15,
  },

  // Epic icons (1.5% chance) - Big wins
  {
    id: "bomb",
    name: "Bomb",
    emoji: "💣",
    rarity: "epic",
    multiplier: 15.0, // 15x win
    weight: 8,
  },
  {
    id: "money_bag",
    name: "Money Bag",
    emoji: "💰",
    rarity: "epic",
    multiplier: 12.0, // 12x win
    weight: 7,
  },

  // Legendary icon (0.3% chance) - JACKPOT!
  {
    id: "godfather",
    name: "Godfather",
    emoji: "🤵",
    rarity: "legendary",
    multiplier: 75.0, // 75x JACKPOT! (was 10x)
    weight: 2,
  },
];

// Calculate total weight for proper probability distribution
export const totalSlotWeight = slotIcons.reduce(
  (sum, icon) => sum + icon.weight,
  0
);

// Payout tiers for different line combinations
export const slotPayoutTiers: SlotPayoutTier[] = [
  {
    tier: "legendary_line",
    description: "Three legendary symbols in middle row",
    multiplier: 15.0,
    probability: 0.000008, // Extremely rare
  },
  {
    tier: "epic_line",
    description: "Three epic symbols in middle row",
    multiplier: 7.5,
    probability: 0.00016,
  },
  {
    tier: "rare_line",
    description: "Three rare symbols in middle row",
    multiplier: 4.5,
    probability: 0.0014,
  },
  {
    tier: "uncommon_line",
    description: "Three uncommon symbols in middle row",
    multiplier: 2.8,
    probability: 0.008,
  },
  {
    tier: "common_line",
    description: "Three common symbols in middle row",
    multiplier: 1.8,
    probability: 0.045,
  },
  {
    tier: "mixed_line",
    description: "Mixed symbols - no payout",
    multiplier: 0,
    probability: 0.945,
  },
];

// American Roulette layout (including 0 and 00)
export const rouletteNumbers: RouletteNumber[] = [
  { number: 0, color: "green", parity: null, range: null },
  { number: "00", color: "green", parity: null, range: null }, // American roulette 00
  { number: 1, color: "red", parity: "odd", range: "low" },
  { number: 2, color: "black", parity: "even", range: "low" },
  { number: 3, color: "red", parity: "odd", range: "low" },
  { number: 4, color: "black", parity: "even", range: "low" },
  { number: 5, color: "red", parity: "odd", range: "low" },
  { number: 6, color: "black", parity: "even", range: "low" },
  { number: 7, color: "red", parity: "odd", range: "low" },
  { number: 8, color: "black", parity: "even", range: "low" },
  { number: 9, color: "red", parity: "odd", range: "low" },
  { number: 10, color: "black", parity: "even", range: "low" },
  { number: 11, color: "black", parity: "odd", range: "low" },
  { number: 12, color: "red", parity: "even", range: "low" },
  { number: 13, color: "black", parity: "odd", range: "low" },
  { number: 14, color: "red", parity: "even", range: "low" },
  { number: 15, color: "black", parity: "odd", range: "low" },
  { number: 16, color: "red", parity: "even", range: "low" },
  { number: 17, color: "black", parity: "odd", range: "low" },
  { number: 18, color: "red", parity: "even", range: "low" },
  { number: 19, color: "red", parity: "odd", range: "high" },
  { number: 20, color: "black", parity: "even", range: "high" },
  { number: 21, color: "red", parity: "odd", range: "high" },
  { number: 22, color: "black", parity: "even", range: "high" },
  { number: 23, color: "red", parity: "odd", range: "high" },
  { number: 24, color: "black", parity: "even", range: "high" },
  { number: 25, color: "red", parity: "odd", range: "high" },
  { number: 26, color: "black", parity: "even", range: "high" },
  { number: 27, color: "red", parity: "odd", range: "high" },
  { number: 28, color: "black", parity: "even", range: "high" },
  { number: 29, color: "black", parity: "odd", range: "high" },
  { number: 30, color: "red", parity: "even", range: "high" },
  { number: 31, color: "black", parity: "odd", range: "high" },
  { number: 32, color: "red", parity: "even", range: "high" },
  { number: 33, color: "black", parity: "odd", range: "high" },
  { number: 34, color: "red", parity: "even", range: "high" },
  { number: 35, color: "black", parity: "odd", range: "high" },
  { number: 36, color: "red", parity: "even", range: "high" },
];

// Casino game configuration
export const casinoConfig: CasinoConfig = {
  slots: {
    minBet: 10,
    maxBet: 10000,
    gridSize: { rows: 3, cols: 3 },
    houseEdge: 0.15, // 15% house edge - more balanced for fun gameplay
  },
  roulette: {
    minBet: 5,
    maxBet: 50000,
    houseEdge: 0.0526, // 5.26% house edge (American roulette with 0 and 00)
  },
};

// Roulette bet types and their payouts
export interface RouletteBet {
  type: string;
  description: string;
  payout: number; // Multiplier for winning bet
  probability: number; // Winning probability
}

export const rouletteBets: RouletteBet[] = [
  // Straight up bets
  {
    type: "straight",
    description: "Single number",
    payout: 35,
    probability: 1 / 38,
  },

  // Even money bets
  { type: "red", description: "Red numbers", payout: 1, probability: 18 / 38 },
  {
    type: "black",
    description: "Black numbers",
    payout: 1,
    probability: 18 / 38,
  },
  {
    type: "even",
    description: "Even numbers",
    payout: 1,
    probability: 18 / 38,
  },
  { type: "odd", description: "Odd numbers", payout: 1, probability: 18 / 38 },
  { type: "low", description: "1-18", payout: 1, probability: 18 / 38 },
  { type: "high", description: "19-36", payout: 1, probability: 18 / 38 },

  // Column/dozen bets
  {
    type: "dozen1",
    description: "1st Dozen (1-12)",
    payout: 2,
    probability: 12 / 38,
  },
  {
    type: "dozen2",
    description: "2nd Dozen (13-24)",
    payout: 2,
    probability: 12 / 38,
  },
  {
    type: "dozen3",
    description: "3rd Dozen (25-36)",
    payout: 2,
    probability: 12 / 38,
  },
];

// Helper functions
export function getSlotIconById(id: string): SlotIcon | undefined {
  return slotIcons.find((icon) => icon.id === id);
}

export function getRouletteNumber(num: number): RouletteNumber | undefined {
  return rouletteNumbers.find((n) => n.number === num);
}

export function getRandomSlotIcon(): SlotIcon {
  const randomWeight = Math.floor(Math.random() * totalSlotWeight);
  let currentWeight = 0;

  for (const icon of slotIcons) {
    currentWeight += icon.weight;
    if (randomWeight < currentWeight) {
      return icon;
    }
  }

  // Fallback to first icon (should never happen)
  return slotIcons[0];
}

export function generateSlotGrid(): SlotIcon[][] {
  const grid: SlotIcon[][] = [];

  for (let row = 0; row < casinoConfig.slots.gridSize.rows; row++) {
    grid[row] = [];
    for (let col = 0; col < casinoConfig.slots.gridSize.cols; col++) {
      grid[row][col] = getRandomSlotIcon();
    }
  }

  return grid;
}

export function checkSlotWin(grid: SlotIcon[][]): {
  isWin: boolean;
  winningLine: SlotIcon[] | null;
  multiplier: number;
  tier: string;
} {
  // Check middle row (row index 1)
  const middleRow = grid[1];
  const firstIcon = middleRow[0];

  // Check if all icons in middle row match
  const isWin = middleRow.every((icon) => icon.id === firstIcon.id);

  if (isWin) {
    const tier =
      slotPayoutTiers.find((t) => t.tier.includes(firstIcon.rarity))?.tier ||
      "common_line";

    return {
      isWin: true,
      winningLine: middleRow,
      multiplier: firstIcon.multiplier,
      tier,
    };
  }

  return {
    isWin: false,
    winningLine: null,
    multiplier: 0,
    tier: "mixed_line",
  };
}

export function spinRoulette(): RouletteNumber {
  const randomIndex = Math.floor(Math.random() * rouletteNumbers.length);
  return rouletteNumbers[randomIndex];
}

export function checkRouletteBet(
  betType: string,
  betNumber: number | string | null,
  spinResult: RouletteNumber
): { isWin: boolean; payout: number } {
  const bet = rouletteBets.find((b) => b.type === betType);
  if (!bet) return { isWin: false, payout: 0 };

  let isWin = false;

  switch (betType) {
    case "straight":
      isWin = betNumber === spinResult.number;
      break;
    case "red":
      isWin = spinResult.color === "red";
      break;
    case "black":
      isWin = spinResult.color === "black";
      break;
    case "even":
      isWin = spinResult.parity === "even";
      break;
    case "odd":
      isWin = spinResult.parity === "odd";
      break;
    case "low":
      isWin = spinResult.range === "low";
      break;
    case "high":
      isWin = spinResult.range === "high";
      break;
    case "dozen1":
      isWin =
        typeof spinResult.number === "number" &&
        spinResult.number >= 1 &&
        spinResult.number <= 12;
      break;
    case "dozen2":
      isWin =
        typeof spinResult.number === "number" &&
        spinResult.number >= 13 &&
        spinResult.number <= 24;
      break;
    case "dozen3":
      isWin =
        typeof spinResult.number === "number" &&
        spinResult.number >= 25 &&
        spinResult.number <= 36;
      break;
  }

  return {
    isWin,
    payout: isWin ? bet.payout : 0,
  };
}
