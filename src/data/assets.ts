/**
 * ASSET TEMPLATES - BUSINESS CONFIGURATION
 *
 * This file defines all purchasable business assets in the MafiaWar game.
 * Each asset represents a business that generates passive income for players.
 *
 * =============================================================================
 * ASSET TEMPLATE STRUCTURE
 * =============================================================================
 *
 * id: Unique identifier for the asset (used in database)
 * type: Business category (shop, restaurant, nightclub, warehouse, casino)
 * name: Display name shown to players
 * description: Flavor text describing the business
 * basePrice: Initial purchase cost in game currency
 * baseIncomeRate: Starting hourly income generation
 * baseSecurityLevel: Starting security rating (unused in simplified system)
 * maxLevel: Maximum upgrade level (determines upgrade array length)
 * category: Business legitimacy level affecting gameplay mechanics
 *   - "legitimate": Low risk, lower income, minimal law enforcement attention
 *   - "semi_legal": Medium risk/reward, moderate law enforcement attention
 *   - "illegal": High risk/reward, heavy law enforcement attention
 *
 * =============================================================================
 * REQUIREMENTS SYSTEM
 * =============================================================================
 *
 * level: Minimum player level required to purchase
 * reputation: Minimum reputation points required (for higher-tier businesses)
 * money: Additional liquid funds required beyond base price
 *
 * =============================================================================
 * UPGRADE SYSTEM (INCOME ONLY)
 * =============================================================================
 *
 * income: Array of upgrade tiers, each containing:
 *   - cost: Price to upgrade to this level
 *   - multiplier: Income rate multiplier applied after upgrade
 *
 * security: Legacy system (kept for backwards compatibility, not used)
 *
 * Example: Level 1→2 upgrade with 1.2x multiplier increases $500/hr → $600/hr
 *
 * =============================================================================
 * INCOME DISTRIBUTION SYSTEM
 * =============================================================================
 *
 * Controls how generated income is split across the 3-layer money system:
 *
 * cash: Percentage going to immediate cash (0-100)
 *   - Vulnerable to theft and raids
 *   - Available for immediate spending
 *   - Higher percentages for cash-heavy businesses
 *
 * bank: Percentage going to secured bank account (0-100)
 *   - Protected from most theft
 *   - Slight government seizure risk for illegal businesses
 *   - Preferred for legitimate businesses
 *
 * crypto: Percentage going to anonymous cryptocurrency (0-100)
 *   - Completely anonymous and secure
 *   - Subject to market volatility
 *   - Preferred for illegal operations
 *
 * cryptoType: Specific cryptocurrency used (defaults to "crypto")
 *
 * Note: cash + bank + crypto must equal 100
 *
 * =============================================================================
 * BUSINESS CHARACTERISTICS
 * =============================================================================
 *
 * seasonality: Income multiplier for seasonal effects (0.8-1.2)
 *   - 1.0 = no seasonal impact
 *   - >1.0 = benefits from seasons (restaurants during holidays)
 *   - <1.0 = suffers during certain seasons
 *
 * marketSensitivity: How much market events affect income (0.0-1.0)
 *   - 0.0 = completely immune to market fluctuations
 *   - 1.0 = heavily affected by market conditions
 *
 * raidVulnerability: Chance of government raids per time period (0.0-1.0)
 *   - 0.0 = never raided (legitimate businesses)
 *   - 1.0 = constantly under government scrutiny
 *   - Higher values for illegal operations
 *
 * =============================================================================
 * BUSINESS PROGRESSION
 * =============================================================================
 *
 * Level 1-5: Convenience Store → Restaurant → Pawn Shop
 * Level 8+: Underground Nightclub (requires reputation)
 * Level 12+: Storage Warehouse (high reputation required)
 * Level 20+: Underground Casino (maximum reputation + liquid funds)
 *
 * Development: Lemonade Stand (testing only, very low cost/income)
 */

export interface AssetTemplate {
  id: string;
  type: string;
  name: string;
  description: string;
  basePrice: number;
  baseIncomeRate: number;
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
  incomeDistribution: {
    cash: number;
    bank: number;
    crypto: number;
    cryptoType?: string;
  };
  characteristics?: {
    seasonality?: number;
    marketSensitivity?: number;
    raidVulnerability?: number;
  };
}

export const assetTemplates: AssetTemplate[] = [
  {
    id: "test_lemonade_stand",
    type: "shop",
    name: "Lemonade Stand",
    description:
      "Simple test business for development - generates small income every few minutes.",
    basePrice: 666,
    baseIncomeRate: 60,
    baseSecurityLevel: 1,
    maxLevel: 3,
    category: "legitimate",
    requirements: {
      level: 1,
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
      cash: 70,
      bank: 30,
      crypto: 0,
      cryptoType: "crypto",
    },
    characteristics: {
      seasonality: 1.0,
      marketSensitivity: 0.1,
      raidVulnerability: 0.01,
    },
  },

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
      cash: 90,
      bank: 10,
      crypto: 0,
    },
    characteristics: {
      seasonality: 1.0,
      marketSensitivity: 0.3,
      raidVulnerability: 0.05,
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
      level: 5,
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
      cash: 85,
      bank: 15,
      crypto: 0,
    },
    characteristics: {
      seasonality: 1.1,
      marketSensitivity: 0.4,
      raidVulnerability: 0.02,
    },
  },

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
      level: 3,
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
      cash: 80,
      bank: 15,
      crypto: 5,
      cryptoType: "crypto",
    },
    characteristics: {
      seasonality: 0.9,
      marketSensitivity: 0.6,
      raidVulnerability: 0.15,
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
      cash: 50,
      bank: 35,
      crypto: 15,
      cryptoType: "crypto",
    },
    characteristics: {
      seasonality: 1.2,
      marketSensitivity: 0.5,
      raidVulnerability: 0.25,
    },
  },

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
      level: 12,
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
      cash: 25,
      bank: 25,
      crypto: 50,
      cryptoType: "crypto",
    },
    characteristics: {
      seasonality: 1.0,
      marketSensitivity: 0.8,
      raidVulnerability: 0.4,
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
      level: 20,
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
      cash: 20,
      bank: 30,
      crypto: 50,
      cryptoType: "crypto",
    },
    characteristics: {
      seasonality: 1.1,
      marketSensitivity: 0.9,
      raidVulnerability: 0.35,
    },
  },
];
