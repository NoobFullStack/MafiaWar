export interface GameItem {
  id: string;
  name: string;
  type: "tool" | "consumable" | "trade_good" | "collectible";
  value: number;
  description: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  metadata?: Record<string, any>;
}

export const gameItems: GameItem[] = [
  // === TOOLS ===
  {
    id: "lockpick_basic",
    name: "Basic Lockpick",
    type: "tool",
    value: 450,
    description:
      "A simple lockpick for basic locks. +5% success rate on theft crimes.",
    rarity: "common",
    metadata: {
      levelRequirement: 1,
      crimeBonus: {
        pickpocket: 0.05,
        burglary: 0.05,
      },
    },
  },
  {
    id: "lockpick_advanced",
    name: "Advanced Lockpick Set",
    type: "tool",
    value: 2250,
    description:
      "Professional lockpick set. +15% success rate on theft crimes.",
    rarity: "uncommon",
    metadata: {
      levelRequirement: 5, // Unlocked at Amateur Thief
      crimeBonus: {
        pickpocket: 0.15,
        burglary: 0.15,
        safe_crack: 0.1,
      },
    },
  },
  {
    id: "crowbar",
    name: "Crowbar",
    type: "tool",
    value: 675,
    description: "Heavy-duty crowbar. +10% success rate on robbery crimes.",
    rarity: "common",
    metadata: {
      levelRequirement: 3, // Unlocked at Petty Criminal
      crimeBonus: {
        robbery: 0.1,
        burglary: 0.08,
      },
    },
  },
  {
    id: "pistol_cheap",
    name: "Cheap Pistol",
    type: "tool",
    value: 14,
    description: "Unreliable handgun. +10% success rate, +5% jail risk.",
    rarity: "uncommon",
    metadata: {
      levelRequirement: 8, // Unlocked at Professional Criminal
      crimeBonus: {
        robbery: 0.1,
        hit_job: 0.15,
      },
      risks: {
        jail_time_multiplier: 1.05,
      },
    },
  },
  {
    id: "laptop_hacking",
    name: "Hacking Laptop",
    type: "tool",
    value: 1200,
    description: "Modified laptop for cybercrime. Required for hacking crimes.",
    rarity: "rare",
    metadata: {
      levelRequirement: 12, // Unlocked at Crime Specialist
      crimeBonus: {
        hacking: 0.25,
        fraud: 0.2,
      },
      requirements: {
        intelligence: 25,
      },
    },
  },

  // === CONSUMABLES ===
  {
    id: "energy_drink",
    name: "Energy Drink",
    type: "consumable",
    value: 1,
    description: "Restores 20 energy points. +3% crime success for 30 minutes.",
    rarity: "common",
    metadata: {
      effects: {
        energy_restore: 20,
      },
      crimeBonus: {
        all_crimes: 0.03,
        duration_minutes: 30,
      },
    },
  },
  {
    id: "medkit_basic",
    name: "Basic Medkit",
    type: "consumable",
    value: 2,
    description: "Restores 50 health points. +5% crime success for 15 minutes.",
    rarity: "common",
    metadata: {
      effects: {
        health_restore: 50,
      },
      crimeBonus: {
        all_crimes: 0.05,
        duration_minutes: 15,
      },
    },
  },
  {
    id: "steroid_shot",
    name: "Steroid Shot",
    type: "consumable",
    value: 30,
    description:
      "Temporarily increases strength by 5 for 1 hour. +10% crime success for 60 minutes.",
    rarity: "uncommon",
    metadata: {
      effects: {
        temp_strength: 5,
        duration_hours: 1,
      },
      crimeBonus: {
        all_crimes: 0.1,
        duration_minutes: 60,
      },
    },
  },

  // === TRADE GOODS ===
  {
    id: "cigarettes",
    name: "Cigarette Cartons",
    type: "trade_good",
    value: 50,
    description: "Contraband cigarettes for smuggling operations.",
    rarity: "common",
    metadata: {
      levelRequirement: 3, // Unlocked at Petty Criminal
      smuggling_value: 175,
      bulk: 2,
    },
  },
  {
    id: "electronics",
    name: "Stolen Electronics",
    type: "trade_good",
    value: 200,
    description: "High-value electronics for fencing operations.",
    rarity: "uncommon",
    metadata: {
      levelRequirement: 8, // Unlocked at Professional Criminal
      fence_value: 600,
      bulk: 5,
    },
  },

  // === COLLECTIBLES ===
  {
    id: "gold_watch",
    name: "Gold Watch",
    type: "collectible",
    value: 2500,
    description: "Luxury timepiece stolen from a wealthy target.",
    rarity: "rare",
    metadata: {
      levelRequirement: 15, // Unlocked at Criminal Mastermind
      prestige_value: 10,
    },
  },
  {
    id: "mafia_ring",
    name: "Mafia Family Ring",
    type: "collectible",
    value: 10000,
    description: "Ceremonial ring proving membership in an old crime family.",
    rarity: "legendary",
    metadata: {
      levelRequirement: 25, // Unlocked at Mafia Lieutenant
      prestige_value: 100,
      reputation_bonus: 25,
    },
  },
];
