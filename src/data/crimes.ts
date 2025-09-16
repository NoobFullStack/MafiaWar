/**
 * CRIME DATA CONFIGURATION
 *
 * This file defines all available crimes in the Mafia War bot game.
 * Each crime has been carefully balanced for optimal risk/reward progression.
 *
 * BALANCE PHILOSOPHY:
 * - Higher difficulty = Higher risk (longer jail time, lower success rate)
 * - Higher difficulty = Higher reward (more money, more XP)
 * - Logical progression from street crimes to organized operations
 * - Success rates decrease as difficulty increases (95% → 15%)
 * - Jail times scale exponentially with crime severity
 * - XP rewards scale with both difficulty and time investment
 * - Cooldowns balance frequency vs reward potential
 *
 * Crime Categories & Progression:
 * - petty (Lv 1-5): Street-level crimes, high success, low risk/reward
 * - theft (Lv 3-10): Property crimes, moderate risk/reward
 * - white_collar (Lv 8-15): Tech crimes, lower violence risk, crypto payments
 * - robbery (Lv 12-20): Violent crimes, higher risk/reward
 * - organized (Lv 18-25): Syndicate operations, massive risk/reward
 * - violence (Lv 25+): Elite operations, extreme risk/reward
 *
 * Payment Types Logic:
 * - cash: Street crimes, immediate small amounts
 * - bank: Laundered funds from organized operations
 * - crypto: Tech crimes and assassination contracts
 * - mixed: Complex operations with multiple revenue streams
 *
 * Success Rate Formula: 95% - (difficulty * 8%) = realistic crime success rates
 * Jail Time Formula: Base minutes * (difficulty^1.5) = escalating consequences
 * XP Formula: (difficulty * 8) + (cooldown_minutes / 10) = time investment rewards
 * Reward Formula: Base amount * (difficulty^1.3) = exponential reward scaling
 */

export interface CrimeData {
  id: string;
  name: string;
  description: string;
  difficulty: number;
  cooldown: number;
  rewardMin: number;
  rewardMax: number;
  xpReward: number;
  baseSuccessRate: number;
  jailTimeMin: number;
  jailTimeMax: number;
  category:
    | "petty"
    | "theft"
    | "robbery"
    | "violence"
    | "white_collar"
    | "organized";
  paymentType?: "cash" | "bank" | "crypto" | "mixed";
  paymentReason?: string;
  requirements?: {
    level?: number;
    reputation?: number;
    items?: string[];
  };
  statBonuses?: {
    strength?: number;
    stealth?: number;
    intelligence?: number;
  };
  riskFactors?: {
    injury_chance?: number;
    heat_generation?: number;
  };
}

export const crimeData: CrimeData[] = [
  {
    id: "pickpocketing",
    name: "Pickpocketing",
    description:
      "Steal wallets and phones from unsuspecting pedestrians in crowded areas.",
    difficulty: 1,
    cooldown: 120,
    rewardMin: 50,
    rewardMax: 100,
    xpReward: 5,
    baseSuccessRate: 0.95,
    jailTimeMin: 2,
    jailTimeMax: 5,
    category: "petty",
    paymentType: "cash",
    requirements: {
      level: 1,
    },
    statBonuses: {
      stealth: 1,
    },
  },
  {
    id: "shoplifting",
    name: "Shoplifting",
    description: "Steal merchandise from retail stores and gas stations.",
    difficulty: 2,
    cooldown: 300,
    rewardMin: 100,
    rewardMax: 200,
    xpReward: 10,
    baseSuccessRate: 0.87,
    jailTimeMin: 5,
    jailTimeMax: 10,
    category: "petty",
    paymentType: "cash",
    requirements: {
      level: 1,
    },
    statBonuses: {
      stealth: 1,
    },
  },
  {
    id: "bike_theft",
    name: "Bike Theft",
    description:
      "Steal bicycles from bike racks, campus areas, and apartment complexes.",
    difficulty: 2,
    cooldown: 480,
    rewardMin: 150,
    rewardMax: 300,
    xpReward: 15,
    baseSuccessRate: 0.87,
    jailTimeMin: 8,
    jailTimeMax: 15,
    category: "petty",
    paymentType: "cash",
    requirements: {
      level: 2,
    },
    statBonuses: {
      stealth: 1,
      strength: 1,
    },
  },
  {
    id: "vandalism",
    name: "Vandalism",
    description:
      "Get paid to spray graffiti or damage property for rival gangs.",
    difficulty: 3,
    cooldown: 600,
    rewardMin: 250,
    rewardMax: 500,
    xpReward: 20,
    baseSuccessRate: 0.79,
    jailTimeMin: 10,
    jailTimeMax: 20,
    category: "petty",
    paymentType: "cash",
    requirements: {
      level: 3,
    },
    statBonuses: {
      strength: 1,
    },
    riskFactors: {
      injury_chance: 0.05,
    },
  },
  {
    id: "car_break_in",
    name: "Car Break-in",
    description:
      "Break into parked vehicles to steal electronics, bags, and valuables.",
    difficulty: 4,
    cooldown: 900,
    rewardMin: 400,
    rewardMax: 800,
    xpReward: 30,
    baseSuccessRate: 0.71,
    jailTimeMin: 15,
    jailTimeMax: 30,
    category: "theft",
    paymentType: "cash",
    requirements: {
      level: 5,
    },
    statBonuses: {
      stealth: 2,
      intelligence: 1,
    },
  },
  {
    id: "car_theft",
    name: "Car Theft",
    description:
      "Steal vehicles from parking lots and streets for resale or parts.",
    difficulty: 5,
    cooldown: 1200,
    rewardMin: 700,
    rewardMax: 1400,
    xpReward: 40,
    baseSuccessRate: 0.63,
    jailTimeMin: 20,
    jailTimeMax: 40,
    category: "theft",
    paymentType: "cash",
    requirements: {
      level: 7,
    },
    statBonuses: {
      stealth: 2,
      intelligence: 1,
    },
  },
  {
    id: "burglary",
    name: "Burglary",
    description:
      "Break into homes and businesses to steal valuables and electronics.",
    difficulty: 6,
    cooldown: 1800,
    rewardMin: 1200,
    rewardMax: 2400,
    xpReward: 60,
    baseSuccessRate: 0.55,
    jailTimeMin: 30,
    jailTimeMax: 60,
    category: "theft",
    paymentType: "mixed",
    paymentReason: "Stolen goods fenced through multiple channels",
    requirements: {
      level: 10,
    },
    statBonuses: {
      stealth: 3,
      intelligence: 1,
    },
    riskFactors: {
      injury_chance: 0.1,
    },
  },
  {
    id: "credit_card_fraud",
    name: "Credit Card Fraud",
    description:
      "Use stolen credit card data for online purchases and cash advances.",
    difficulty: 4,
    cooldown: 1500,
    rewardMin: 600,
    rewardMax: 1200,
    xpReward: 35,
    baseSuccessRate: 0.71,
    jailTimeMin: 25,
    jailTimeMax: 45,
    category: "white_collar",
    paymentType: "crypto",
    paymentReason: "Digital theft converted to untraceable cryptocurrency",
    requirements: {
      level: 8,
    },
    statBonuses: {
      intelligence: 2,
    },
  },
  {
    id: "identity_theft",
    name: "Identity Theft",
    description:
      "Steal personal information to open fraudulent accounts and loans.",
    difficulty: 5,
    cooldown: 2400,
    rewardMin: 1000,
    rewardMax: 2000,
    xpReward: 50,
    baseSuccessRate: 0.63,
    jailTimeMin: 35,
    jailTimeMax: 70,
    category: "white_collar",
    paymentType: "bank",
    paymentReason: "Fraudulent accounts appear as legitimate bank transfers",
    requirements: {
      level: 12,
    },
    statBonuses: {
      intelligence: 3,
    },
  },
  {
    id: "hacking",
    name: "Corporate Hacking",
    description:
      "Hack into corporate systems to steal data, cryptocurrency, and trade secrets.",
    difficulty: 7,
    cooldown: 3600,
    rewardMin: 2500,
    rewardMax: 5000,
    xpReward: 80,
    baseSuccessRate: 0.47,
    jailTimeMin: 45,
    jailTimeMax: 90,
    category: "white_collar",
    paymentType: "crypto",
    paymentReason: "Digital assets stolen and converted to untraceable crypto",
    requirements: {
      level: 15,
    },
    statBonuses: {
      intelligence: 4,
    },
  },
  {
    id: "mugging",
    name: "Armed Mugging",
    description: "Rob individuals at gunpoint in alleys and isolated areas.",
    difficulty: 6,
    cooldown: 2100,
    rewardMin: 800,
    rewardMax: 1600,
    xpReward: 65,
    baseSuccessRate: 0.55,
    jailTimeMin: 40,
    jailTimeMax: 80,
    category: "robbery",
    paymentType: "cash",
    requirements: {
      level: 12,
    },
    statBonuses: {
      strength: 2,
      stealth: 1,
    },
    riskFactors: {
      injury_chance: 0.15,
      heat_generation: 2,
    },
  },
  {
    id: "store_robbery",
    name: "Armed Store Robbery",
    description:
      "Rob convenience stores, gas stations, and small businesses at gunpoint.",
    difficulty: 7,
    cooldown: 3000,
    rewardMin: 1500,
    rewardMax: 3000,
    xpReward: 85,
    baseSuccessRate: 0.47,
    jailTimeMin: 60,
    jailTimeMax: 120,
    category: "robbery",
    paymentType: "cash",
    requirements: {
      level: 15,
    },
    statBonuses: {
      strength: 3,
      stealth: 1,
    },
    riskFactors: {
      injury_chance: 0.2,
      heat_generation: 3,
    },
  },
  {
    id: "bank_robbery",
    name: "Bank Robbery",
    description:
      "Execute coordinated armed robberies of banks and credit unions.",
    difficulty: 8,
    cooldown: 4800,
    rewardMin: 4000,
    rewardMax: 8000,
    xpReward: 120,
    baseSuccessRate: 0.39,
    jailTimeMin: 90,
    jailTimeMax: 150,
    category: "robbery",
    paymentType: "mixed",
    paymentReason: "Cash stolen + digital transfers laundered through accounts",
    requirements: {
      level: 18,
    },
    statBonuses: {
      strength: 3,
      stealth: 2,
      intelligence: 1,
    },
    riskFactors: {
      injury_chance: 0.25,
      heat_generation: 5,
    },
  },
  {
    id: "drug_dealing",
    name: "Drug Distribution",
    description:
      "Distribute illegal narcotics through established street networks.",
    difficulty: 7,
    cooldown: 3600,
    rewardMin: 3000,
    rewardMax: 6000,
    xpReward: 90,
    baseSuccessRate: 0.47,
    jailTimeMin: 75,
    jailTimeMax: 135,
    category: "organized",
    paymentType: "cash",
    paymentReason: "Street-level cash transactions",
    requirements: {
      level: 18,
      reputation: 50,
    },
    statBonuses: {
      stealth: 2,
      intelligence: 2,
    },
    riskFactors: {
      injury_chance: 0.2,
      heat_generation: 4,
    },
  },
  {
    id: "extortion",
    name: "Business Extortion",
    description:
      "Extract protection money from businesses through intimidation and threats.",
    difficulty: 8,
    cooldown: 4200,
    rewardMin: 4000,
    rewardMax: 8000,
    xpReward: 110,
    baseSuccessRate: 0.39,
    jailTimeMin: 100,
    jailTimeMax: 160,
    category: "organized",
    paymentType: "mixed",
    paymentReason: "Protection payments processed through business accounts",
    requirements: {
      level: 20,
      reputation: 75,
    },
    statBonuses: {
      strength: 3,
      intelligence: 2,
    },
    riskFactors: {
      injury_chance: 0.25,
      heat_generation: 4,
    },
  },
  {
    id: "money_laundering",
    name: "Money Laundering Operation",
    description:
      "Clean dirty money through shell companies and legitimate businesses.",
    difficulty: 9,
    cooldown: 5400,
    rewardMin: 6000,
    rewardMax: 12000,
    xpReward: 140,
    baseSuccessRate: 0.31,
    jailTimeMin: 120,
    jailTimeMax: 180,
    category: "organized",
    paymentType: "bank",
    paymentReason: "Laundered funds appear as legitimate business income",
    requirements: {
      level: 22,
      reputation: 100,
    },
    statBonuses: {
      intelligence: 4,
    },
    riskFactors: {
      heat_generation: 6,
    },
  },
  {
    id: "arms_trafficking",
    name: "Arms Trafficking",
    description:
      "Smuggle and distribute illegal weapons through international networks.",
    difficulty: 9,
    cooldown: 6000,
    rewardMin: 8000,
    rewardMax: 16000,
    xpReward: 150,
    baseSuccessRate: 0.31,
    jailTimeMin: 120,
    jailTimeMax: 180,
    category: "organized",
    paymentType: "mixed",
    paymentReason: "Weapons sales through multiple international channels",
    requirements: {
      level: 24,
      reputation: 150,
    },
    statBonuses: {
      strength: 2,
      intelligence: 3,
    },
    riskFactors: {
      injury_chance: 0.3,
      heat_generation: 7,
    },
  },
  {
    id: "assassination",
    name: "Contract Assassination",
    description:
      "Execute high-value targets for elite clients and criminal organizations.",
    difficulty: 10,
    cooldown: 7200,
    rewardMin: 15000,
    rewardMax: 30000,
    xpReward: 200,
    baseSuccessRate: 0.23,
    jailTimeMin: 150,
    jailTimeMax: 180,
    category: "violence",
    paymentType: "crypto",
    paymentReason: "Contract payments in untraceable cryptocurrency",
    requirements: {
      level: 25,
      reputation: 200,
    },
    statBonuses: {
      strength: 3,
      stealth: 4,
      intelligence: 2,
    },
    riskFactors: {
      injury_chance: 0.35,
      heat_generation: 8,
    },
  },
  {
    id: "heist",
    name: "Grand Heist",
    description:
      "Orchestrate elaborate multi-target robberies of casinos, museums, or government facilities.",
    difficulty: 10,
    cooldown: 8400,
    rewardMin: 20000,
    rewardMax: 40000,
    xpReward: 220,
    baseSuccessRate: 0.23,
    jailTimeMin: 150,
    jailTimeMax: 180,
    category: "violence",
    paymentType: "mixed",
    paymentReason: "Multi-target heist proceeds distributed across accounts",
    requirements: {
      level: 28,
      reputation: 300,
    },
    statBonuses: {
      strength: 3,
      stealth: 3,
      intelligence: 4,
    },
    riskFactors: {
      injury_chance: 0.4,
      heat_generation: 10,
    },
  },
  {
    id: "cartel_operation",
    name: "International Cartel Operation",
    description:
      "Lead massive drug and trafficking operations across international borders.",
    difficulty: 11,
    cooldown: 10800,
    rewardMin: 30000,
    rewardMax: 60000,
    xpReward: 280,
    baseSuccessRate: 0.15,
    jailTimeMin: 150,
    jailTimeMax: 180,
    category: "organized",
    paymentType: "mixed",
    paymentReason:
      "International cartel profits through complex financial networks",
    requirements: {
      level: 30,
      reputation: 500,
    },
    statBonuses: {
      strength: 4,
      stealth: 3,
      intelligence: 4,
    },
    riskFactors: {
      injury_chance: 0.45,
      heat_generation: 12,
    },
  },
];
