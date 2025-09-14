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
}

export const assetTemplates: AssetTemplate[] = [
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
      level: 3,
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
      level: 2,
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
      level: 10,
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
      level: 15,
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
  },
];
