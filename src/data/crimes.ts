export interface CrimeData {
  id: string;
  name: string;
  description: string;
  difficulty: number; // 1-10 scale
  cooldown: number; // seconds
  rewardMin: number;
  rewardMax: number;
  baseSuccessRate: number; // 0.0-1.0
  jailTimeMin: number; // minutes on failure
  jailTimeMax: number;
  category: "petty" | "theft" | "robbery" | "violence" | "white_collar" | "organized";
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
    id: "pickpocket",
    name: "Pickpocketing",
    description: "Steal from unsuspecting pedestrians in crowded areas.",
    difficulty: 1,
    cooldown: 300, // 5 minutes
    rewardMin: 50,
    rewardMax: 200,
    baseSuccessRate: 0.75,
    jailTimeMin: 15,
    jailTimeMax: 30,
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
    rewardMin: 100,
    rewardMax: 300,
    baseSuccessRate: 0.70,
    jailTimeMin: 30,
    jailTimeMax: 60,
    category: "theft",
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
    baseSuccessRate: 0.80,
    jailTimeMin: 45,
    jailTimeMax: 90,
    category: "theft",
    requirements: {
      level: 2,
    },
    statBonuses: {
      stealth: 1,
      strength: 1,
    },
  },

  // === THEFT CRIMES ===
  {
    id: "car_theft",
    name: "Car Theft",
    description: "Steal vehicles from parking lots and streets.",
    difficulty: 4,
    cooldown: 1800, // 30 minutes
    rewardMin: 500,
    rewardMax: 2000,
    baseSuccessRate: 0.65,
    jailTimeMin: 60,
    jailTimeMax: 180,
    category: "theft",
    requirements: {
      level: 3,
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
    rewardMin: 1200,
    rewardMax: 3500,
    baseSuccessRate: 0.60,
    jailTimeMin: 90,
    jailTimeMax: 240,
    category: "theft",
    requirements: {
      level: 4,
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
    rewardMin: 1500,
    rewardMax: 4000,
    baseSuccessRate: 0.55,
    jailTimeMin: 120,
    jailTimeMax: 300,
    category: "robbery",
    requirements: {
      level: 5,
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
    rewardMin: 5000,
    rewardMax: 15000,
    baseSuccessRate: 0.35,
    jailTimeMin: 300,
    jailTimeMax: 600,
    category: "robbery",
    requirements: {
      level: 10,
      strength: 30,
      intelligence: 25,
    },
    statBonuses: {
      strength: 3,
      intelligence: 2,
      stealth: 1,
    },
    riskFactors: {
      injury_chance: 0.25,
      heat_generation: 5,
    },
  },

  // === WHITE COLLAR CRIMES ===
  {
    id: "credit_card_fraud",
    name: "Credit Card Fraud",
    description: "Use stolen credit card information for online purchases.",
    difficulty: 4,
    cooldown: 1800, // 30 minutes
    rewardMin: 600,
    rewardMax: 1800,
    baseSuccessRate: 0.70,
    jailTimeMin: 60,
    jailTimeMax: 150,
    category: "white_collar",
    requirements: {
      level: 3,
      intelligence: 18,
    },
    statBonuses: {
      intelligence: 2,
    },
  },
  {
    id: "hacking",
    name: "Cyber Hacking",
    description: "Hack into computer systems to steal data and money.",
    difficulty: 7,
    cooldown: 4800, // 80 minutes
    rewardMin: 2000,
    rewardMax: 6000,
    baseSuccessRate: 0.50,
    jailTimeMin: 180,
    jailTimeMax: 360,
    category: "white_collar",
    requirements: {
      level: 8,
      intelligence: 35,
      items: ["laptop_hacking"],
    },
    statBonuses: {
      intelligence: 3,
    },
  },
];
