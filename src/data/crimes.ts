export interface CrimeData {
  id: string;
  name: string;
  description: string;
  difficulty: number; // 1-10 scale
  cooldown: number; // seconds
  rewardMin: number;
  rewardMax: number;
  xpReward: number; // Experience points gained
  baseSuccessRate: number; // 0.0-1.0
  jailTimeMin: number; // minutes on failure
  jailTimeMax: number;
  category:
    | "petty"
    | "theft"
    | "robbery"
    | "violence"
    | "white_collar"
    | "organized";
  // NEW: Strategic payout system
  paymentType?: "cash" | "bank" | "crypto" | "mixed"; // Where money goes
  paymentReason?: string; // Explanation for players
  requirements?: {
    level?: number;
    reputation?: number;
    intelligence?: number;
    strength?: number;
    stealth?: number;
    items?: string[]; // Required item IDs
  };
  statBonuses?: {
    strength?: number;
    stealth?: number;
    intelligence?: number;
  };
  riskFactors?: {
    injury_chance?: number;
    heat_generation?: number; // Police attention
  };
}

export const crimeData: CrimeData[] = [
  // === PETTY CRIMES ===
  {
    id: "pickpocketing",
    name: "Pickpocketing",
    description: "Steal from unsuspecting pedestrians in crowded areas.",
    difficulty: 1,
    cooldown: 1, // 1 second - changed from 1 to avoid potential division issues
    rewardMin: 50,
    rewardMax: 200,
    xpReward: 10, // Low XP for beginner crime
    baseSuccessRate: 0.0,
    jailTimeMin: 1,
    jailTimeMax: 2,
    category: "petty",
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
    description: "Steal merchandise from retail stores.",
    difficulty: 2,
    cooldown: 600, // 10 minutes
    rewardMin: 150,
    rewardMax: 450,
    xpReward: 15, // Slightly more XP for difficulty 2
    baseSuccessRate: 0.7,
    jailTimeMin: 30,
    jailTimeMax: 60,
    category: "petty",
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
    description: "Steal bicycles from bike racks and parking areas.",
    difficulty: 2,
    cooldown: 900, // 15 minutes
    rewardMin: 200,
    rewardMax: 500,
    xpReward: 15, // Same as shoplifting (difficulty 2)
    baseSuccessRate: 0.8,
    jailTimeMin: 20,
    jailTimeMax: 45,
    category: "theft",
    requirements: {
      level: 3, // Unlocked at Petty Criminal
    },
    statBonuses: {
      stealth: 1,
      strength: 1,
    },
  },

  // === FRAUD CRIMES ===
  {
    id: "credit_card_fraud",
    name: "Credit Card Fraud",
    description: "Use stolen credit card information for online purchases.",
    difficulty: 4,
    cooldown: 1800, // 30 minutes
    rewardMin: 1200,
    rewardMax: 2400,
    xpReward: 26, // Difficulty 4 × 5 + (1800/300) = 26
    baseSuccessRate: 0.7,
    jailTimeMin: 60,
    jailTimeMax: 180,
    category: "white_collar",
    requirements: {
      level: 3, // Unlocked at Petty Criminal
      intelligence: 15,
    },
    statBonuses: {
      intelligence: 2,
    },
  },

  // === THEFT CRIMES ===
  {
    id: "car_theft",
    name: "Car Theft",
    description: "Steal vehicles from parking lots and streets.",
    difficulty: 4,
    cooldown: 1800, // 30 minutes
    rewardMin: 800,
    rewardMax: 2400,
    xpReward: 26, // Difficulty 4 × 5 + (1800/300) = 26
    baseSuccessRate: 0.65,
    jailTimeMin: 60,
    jailTimeMax: 180,
    category: "theft",
    requirements: {
      level: 5, // Unlocked at Amateur Thief
      stealth: 15,
    },
    statBonuses: {
      stealth: 2,
      intelligence: 1,
    },
  },
  {
    id: "burglary",
    name: "Burglary",
    description: "Break into homes and steal valuables.",
    difficulty: 5,
    cooldown: 2400, // 40 minutes
    rewardMin: 2000,
    rewardMax: 4500,
    xpReward: 33, // Difficulty 5 × 5 + (2400/300) = 33
    baseSuccessRate: 0.6,
    jailTimeMin: 90,
    jailTimeMax: 240,
    category: "theft",
    requirements: {
      level: 8, // Unlocked at Professional Criminal
      stealth: 20,
    },
    statBonuses: {
      stealth: 2,
      intelligence: 1,
    },
  },

  // === ROBBERY CRIMES ===
  {
    id: "store_robbery",
    name: "Store Robbery",
    description: "Rob convenience stores and small businesses.",
    difficulty: 6,
    cooldown: 3600, // 1 hour
    rewardMin: 2500,
    rewardMax: 5500,
    xpReward: 42, // Difficulty 6 × 5 + (3600/300) = 42
    baseSuccessRate: 0.55,
    jailTimeMin: 120,
    jailTimeMax: 300,
    category: "robbery",
    requirements: {
      level: 8, // Unlocked at Professional Criminal
      strength: 20,
    },
    statBonuses: {
      strength: 2,
      stealth: 1,
    },
    riskFactors: {
      injury_chance: 0.1,
      heat_generation: 2,
    },
  },
  {
    id: "bank_robbery",
    name: "Bank Robbery",
    description: "Rob banks for large cash rewards - high risk, high reward.",
    difficulty: 9,
    cooldown: 7200, // 2 hours
    rewardMin: 6000,
    rewardMax: 18000,
    xpReward: 69, // Difficulty 9 × 5 + (7200/300) = 69
    baseSuccessRate: 0.35,
    jailTimeMin: 300,
    jailTimeMax: 720,
    category: "robbery",
    paymentType: "mixed", // Cash + some goes to bank (money laundering)
    paymentReason: "Cash stolen + laundered funds transferred to bank",
    requirements: {
      level: 15, // Unlocked at Criminal Mastermind
      strength: 35,
      stealth: 30,
    },
    statBonuses: {
      strength: 3,
      stealth: 2,
    },
    riskFactors: {
      injury_chance: 0.25,
      heat_generation: 5,
    },
  },

  // === WHITE COLLAR CRIMES ===
  {
    id: "hacking",
    name: "Cyber Hacking",
    description: "Hack into computer systems to steal data and money.",
    difficulty: 7,
    cooldown: 4800, // 80 minutes
    rewardMin: 4000,
    rewardMax: 8500,
    xpReward: 51, // Difficulty 7 × 5 + (4800/300) = 51
    baseSuccessRate: 0.5,
    jailTimeMin: 180,
    jailTimeMax: 480,
    category: "white_collar",
    paymentType: "crypto", // Digital crimes pay in cryptocurrency
    paymentReason: "Digital theft converted to untraceable cryptocurrency",
    requirements: {
      level: 12, // Unlocked at Crime Specialist
      intelligence: 30,
    },
    statBonuses: {
      intelligence: 3,
    },
  },

  // === ORGANIZED CRIME ===
  {
    id: "drug_dealing",
    name: "Drug Dealing",
    description: "Distribute illegal substances for high profits.",
    difficulty: 8,
    cooldown: 5400, // 90 minutes
    rewardMin: 5000,
    rewardMax: 12000,
    xpReward: 58, // Difficulty 8 × 5 + (5400/300) = 58
    baseSuccessRate: 0.4,
    jailTimeMin: 240,
    jailTimeMax: 600,
    category: "organized",
    paymentType: "cash", // Drug money is always cash
    paymentReason: "Street-level cash transactions",
    requirements: {
      level: 18,
      reputation: 100,
      stealth: 25,
    },
    statBonuses: {
      stealth: 2,
      intelligence: 1,
    },
    riskFactors: {
      injury_chance: 0.15,
      heat_generation: 4,
    },
  },

  {
    id: "extortion",
    name: "Extortion",
    description: "Extract protection money from businesses through intimidation.",
    difficulty: 8,
    cooldown: 6000, // 100 minutes
    rewardMin: 4500,
    rewardMax: 11000,
    xpReward: 60, // Difficulty 8 × 5 + (6000/300) = 60
    baseSuccessRate: 0.45,
    jailTimeMin: 220,
    jailTimeMax: 540,
    category: "organized",
    paymentType: "mixed", // Business payments go to bank
    paymentReason: "Protection payments processed through business accounts",
    requirements: {
      level: 16,
      reputation: 80,
      strength: 30,
      intelligence: 20,
    },
    statBonuses: {
      strength: 2,
      intelligence: 2,
    },
    riskFactors: {
      injury_chance: 0.2,
      heat_generation: 3,
    },
  },

  {
    id: "money_laundering",
    name: "Money Laundering",
    description: "Clean dirty money through legitimate businesses.",
    difficulty: 9,
    cooldown: 7200, // 120 minutes
    rewardMin: 7000,
    rewardMax: 15000,
    xpReward: 69, // Difficulty 9 × 5 + (7200/300) = 69
    baseSuccessRate: 0.35,
    jailTimeMin: 300,
    jailTimeMax: 720,
    category: "white_collar",
    paymentType: "bank", // All cleaned money goes to bank
    paymentReason: "Laundered funds transferred to legitimate accounts",
    requirements: {
      level: 20,
      reputation: 150,
      intelligence: 40,
    },
    statBonuses: {
      intelligence: 4,
    },
    riskFactors: {
      heat_generation: 5,
    },
  },

  {
    id: "assassination",
    name: "Assassination",
    description: "Elite contract killings for the highest bidders.",
    difficulty: 10,
    cooldown: 10800, // 180 minutes
    rewardMin: 15000,
    rewardMax: 35000,
    xpReward: 86, // Difficulty 10 × 5 + (10800/300) = 86
    baseSuccessRate: 0.25,
    jailTimeMin: 480,
    jailTimeMax: 1440,
    category: "violence",
    paymentType: "crypto", // Untraceable payments
    paymentReason: "Contract payments in untraceable cryptocurrency",
    requirements: {
      level: 25,
      reputation: 250,
      strength: 40,
      stealth: 40,
      intelligence: 30,
    },
    statBonuses: {
      strength: 3,
      stealth: 3,
      intelligence: 2,
    },
    riskFactors: {
      injury_chance: 0.3,
      heat_generation: 8,
    },
  },

  {
    id: "arms_trafficking",
    name: "Arms Trafficking",
    description: "Smuggle and distribute illegal weapons.",
    difficulty: 9,
    cooldown: 8400, // 140 minutes
    rewardMin: 8000,
    rewardMax: 20000,
    xpReward: 73, // Difficulty 9 × 5 + (8400/300) = 73
    baseSuccessRate: 0.3,
    jailTimeMin: 360,
    jailTimeMax: 900,
    category: "organized",
    paymentType: "mixed", // Cash + crypto for international deals
    paymentReason: "Weapons sales through multiple payment channels",
    requirements: {
      level: 22,
      reputation: 200,
      strength: 35,
      intelligence: 25,
    },
    statBonuses: {
      strength: 2,
      intelligence: 3,
    },
    riskFactors: {
      injury_chance: 0.25,
      heat_generation: 6,
    },
  },

  {
    id: "heist",
    name: "Grand Heist",
    description: "Orchestrate elaborate multi-target robberies.",
    difficulty: 10,
    cooldown: 14400, // 240 minutes (4 hours)
    rewardMin: 20000,
    rewardMax: 50000,
    xpReward: 98, // Difficulty 10 × 5 + (14400/300) = 98
    baseSuccessRate: 0.2,
    jailTimeMin: 600,
    jailTimeMax: 1800,
    category: "organized",
    paymentType: "mixed", // Complex heists have mixed payouts
    paymentReason: "Multi-target heist proceeds distributed across accounts",
    requirements: {
      level: 30,
      reputation: 400,
      strength: 35,
      stealth: 35,
      intelligence: 35,
    },
    statBonuses: {
      strength: 3,
      stealth: 3,
      intelligence: 4,
    },
    riskFactors: {
      injury_chance: 0.35,
      heat_generation: 10,
    },
  },
];
