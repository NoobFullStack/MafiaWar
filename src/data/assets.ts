export interface AssetTemplate {
  id: string;
  type: string;
  name: string;
  description: string;
  basePrice: number;
  baseIncomeRate: number; // per hour
  baseSecurityLevel: number;
  maxLevel: number;
  category: "legitimate" | "semi_legal" | "illegal";
  requirements?: {
    level?: number;
    reputation?: number;
    money?: number;
  };
  upgrades?: {
    income: { cost: number; multiplier: number }[];
    security: { cost: number; value: number }[];
  };
  // NEW: Strategic income distribution across 3-layered money system
  incomeDistribution: {
    cash: number; // Percentage (0-100) - immediate, vulnerable to theft
    bank: number; // Percentage (0-100) - secure, government seizure risk
    crypto: number; // Percentage (0-100) - anonymous, market volatility risk
    cryptoType?: string; // Preferred crypto coin for payments (optional)
  };
  // Business-specific characteristics for income generation
  characteristics?: {
    seasonality?: number; // 0.8-1.2 multiplier for seasonal businesses
    marketSensitivity?: number; // How much market events affect this business
    raidVulnerability?: number; // Chance of government raids (0-1)
  };
}

export const assetTemplates: AssetTemplate[] = [
  // === DEVELOPMENT TEST BUSINESS ===
  {
    id: "test_lemonade_stand",
    type: "shop",
    name: "Lemonade Stand",
    description: "Simple test business for development - generates small income every few minutes.",
    basePrice: 100, // Very affordable for testing
    baseIncomeRate: 60, // $1 per minute (60/hour) for quick testing
    baseSecurityLevel: 1,
    maxLevel: 3,
    category: "legitimate",
    requirements: {
      level: 1, // No level lock
    },
    upgrades: {
      income: [
        { cost: 50, multiplier: 1.5 },
        { cost: 100, multiplier: 2.0 },
      ],
      security: [
        { cost: 25, value: 2 },
        { cost: 50, value: 3 },
      ],
    },
    incomeDistribution: {
      cash: 40, // 40% cash for quick testing
      bank: 30, // 30% bank for testing bank mechanics
      crypto: 30, // 30% crypto for testing crypto mechanics
      cryptoType: "bitcoin",
    },
    characteristics: {
      seasonality: 1.0,
      marketSensitivity: 0.1,
      raidVulnerability: 0.01, // Almost no risk for testing
    },
  },

  // === LEGITIMATE BUSINESSES ===
  {
    id: "convenience_store",
    type: "shop",
    name: "Convenience Store",
    description: "Small neighborhood store selling everyday items.",
    basePrice: 15000,
    baseIncomeRate: 500,
    baseSecurityLevel: 1,
    maxLevel: 5,
    category: "legitimate",
    requirements: {
      level: 1,
    },
    upgrades: {
      income: [
        { cost: 5000, multiplier: 1.2 },
        { cost: 10000, multiplier: 1.4 },
        { cost: 20000, multiplier: 1.6 },
        { cost: 40000, multiplier: 2.0 },
      ],
      security: [
        { cost: 2000, value: 2 },
        { cost: 5000, value: 3 },
        { cost: 10000, value: 5 },
        { cost: 20000, value: 8 },
      ],
    },
    incomeDistribution: {
      cash: 90, // Daily sales, mostly cash transactions
      bank: 10, // Small card payments and suppliers
      crypto: 0, // No crypto for basic legitimate business
    },
    characteristics: {
      seasonality: 1.0,
      marketSensitivity: 0.3,
      raidVulnerability: 0.05, // Very low chance
    },
  },
  {
    id: "restaurant",
    type: "restaurant",
    name: "Family Restaurant",
    description: "Traditional restaurant serving comfort food.",
    basePrice: 45000,
    baseIncomeRate: 1200,
    baseSecurityLevel: 2,
    maxLevel: 5,
    category: "legitimate",
    requirements: {
      level: 5, // Unlocked at Amateur Thief
    },
    upgrades: {
      income: [
        { cost: 15000, multiplier: 1.3 },
        { cost: 25000, multiplier: 1.6 },
        { cost: 40000, multiplier: 2.0 },
        { cost: 80000, multiplier: 2.5 },
      ],
      security: [
        { cost: 8000, value: 3 },
        { cost: 15000, value: 5 },
        { cost: 25000, value: 8 },
        { cost: 50000, value: 12 },
      ],
    },
    incomeDistribution: {
      cash: 85, // Tips and some cash customers
      bank: 15, // Credit cards, proper business banking
      crypto: 0, // Legitimate restaurant doesn't use crypto
    },
    characteristics: {
      seasonality: 1.1,
      marketSensitivity: 0.4,
      raidVulnerability: 0.02, // Extremely low for legitimate business
    },
  },

  // === SEMI-LEGAL BUSINESSES ===
  {
    id: "pawn_shop",
    type: "shop",
    name: "Pawn Shop",
    description: "Buy and sell second-hand goods, no questions asked.",
    basePrice: 35000,
    baseIncomeRate: 800,
    baseSecurityLevel: 2,
    maxLevel: 5,
    category: "semi_legal",
    requirements: {
      level: 3, // Unlocked at Petty Criminal
    },
    upgrades: {
      income: [
        { cost: 12000, multiplier: 1.3 },
        { cost: 20000, multiplier: 1.6 },
        { cost: 35000, multiplier: 2.0 },
        { cost: 70000, multiplier: 2.5 },
      ],
      security: [
        { cost: 6000, value: 3 },
        { cost: 12000, value: 5 },
        { cost: 25000, value: 8 },
        { cost: 50000, value: 12 },
      ],
    },
    incomeDistribution: {
      cash: 80, // Cash business, "no questions asked"
      bank: 15, // Some legitimate banking
      crypto: 5, // Small anonymous transactions
      cryptoType: "bitcoin", // Game-specific currency for sketchy deals
    },
    characteristics: {
      seasonality: 0.9,
      marketSensitivity: 0.6,
      raidVulnerability: 0.15, // Higher risk due to questionable practices
    },
  },
  {
    id: "nightclub",
    type: "nightclub",
    name: "Underground Nightclub",
    description: "High-energy club with VIP rooms for special activities.",
    basePrice: 150000,
    baseIncomeRate: 3500,
    baseSecurityLevel: 5,
    maxLevel: 5,
    category: "semi_legal",
    requirements: {
      level: 8,
      reputation: 25,
    },
    upgrades: {
      income: [
        { cost: 50000, multiplier: 1.5 },
        { cost: 100000, multiplier: 2.0 },
        { cost: 200000, multiplier: 2.7 },
        { cost: 400000, multiplier: 3.5 },
      ],
      security: [
        { cost: 25000, value: 8 },
        { cost: 50000, value: 12 },
        { cost: 100000, value: 18 },
        { cost: 200000, value: 25 },
      ],
    },
    incomeDistribution: {
      cash: 50, // Door fees, drinks, private room payments
      bank: 35, // Card payments, DJ fees, legitimate business
      crypto: 15, // VIP services, underground activities
      cryptoType: "bitcoin", // Popular for club scenes
    },
    characteristics: {
      seasonality: 1.2,
      marketSensitivity: 0.5,
      raidVulnerability: 0.25, // Higher profile attracts attention
    },
  },

  // === ILLEGAL OPERATIONS ===
  {
    id: "warehouse",
    type: "warehouse",
    name: "Storage Warehouse",
    description: "Large facility for storing and distributing contraband.",
    basePrice: 200000,
    baseIncomeRate: 2500,
    baseSecurityLevel: 4,
    maxLevel: 5,
    category: "illegal",
    requirements: {
      level: 12, // Unlocked at Crime Specialist
      reputation: 50,
    },
    upgrades: {
      income: [
        { cost: 60000, multiplier: 1.6 },
        { cost: 120000, multiplier: 2.2 },
        { cost: 250000, multiplier: 3.0 },
        { cost: 500000, multiplier: 4.0 },
      ],
      security: [
        { cost: 40000, value: 7 },
        { cost: 80000, value: 12 },
        { cost: 160000, value: 20 },
        { cost: 320000, value: 30 },
      ],
    },
    incomeDistribution: {
      cash: 25, // Direct contraband sales
      bank: 25, // Laundered through shell companies
      crypto: 50, // Anonymous transactions for illegal goods
      cryptoType: "bitcoin", // Underground currency for illegal activities
    },
    characteristics: {
      seasonality: 1.0,
      marketSensitivity: 0.8,
      raidVulnerability: 0.4, // High risk of government raids
    },
  },
  {
    id: "casino",
    type: "casino",
    name: "Underground Casino",
    description: "High-stakes gambling den with exclusive clientele.",
    basePrice: 500000,
    baseIncomeRate: 8000,
    baseSecurityLevel: 8,
    maxLevel: 5,
    category: "illegal",
    requirements: {
      level: 20, // Unlocked at Crime Boss
      reputation: 100,
      money: 750000,
    },
    upgrades: {
      income: [
        { cost: 150000, multiplier: 1.4 },
        { cost: 300000, multiplier: 1.8 },
        { cost: 600000, multiplier: 2.3 },
        { cost: 1200000, multiplier: 3.0 },
      ],
      security: [
        { cost: 100000, value: 12 },
        { cost: 200000, value: 18 },
        { cost: 400000, value: 26 },
        { cost: 800000, value: 35 },
      ],
    },
    incomeDistribution: {
      cash: 20, // Small bets, tips
      bank: 30, // Laundered winnings through front businesses
      crypto: 50, // High-stakes anonymous gambling
      cryptoType: "bitcoin", // Preferred for big money laundering
    },
    characteristics: {
      seasonality: 1.1,
      marketSensitivity: 0.9,
      raidVulnerability: 0.35, // Very high profile, attracts law enforcement
    },
  },
];
