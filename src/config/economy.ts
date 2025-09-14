/**
 * MAFIA WAR ECONOMY CONFIGURATION
 * 
 * This economy is designed around ACTUAL GAMEPLAY VALUE:
 * - Item costs based on earnings they enable
 * - Progression gates that make sense for a criminal empire
 * - Risk/reward balance for different criminal activities
 * - Real progression that feels earned, not given away
 */

// === CORE GAMEPLAY ECONOMICS ===
export const ECONOMY_CONFIG = {
  // Player progression and income scaling
  PLAYER_PROGRESSION: {
    STARTING_MONEY: 500, // Enough for basic tools only
    DAILY_PASSIVE_INCOME: 0, // No free money - earn through crimes
    LEVEL_MONEY_BONUS: 100, // Bonus money per level up
    
    // How much money players should have at different levels
    EXPECTED_WEALTH_BY_LEVEL: {
      1: 500,      // Starting cash
      5: 5000,     // Basic criminal
      10: 25000,   // Experienced thief  
      15: 75000,   // Professional criminal
      20: 200000,  // Crime boss
      25: 500000,  // Mafia lieutenant
      30: 1000000, // Crime lord
    },
  },

  // Crime-based income analysis (per hour of play)
  CRIME_INCOME_RATES: {
    // Expected income per hour by crime difficulty
    BEGINNER_CRIMES: {
      difficulty_range: [1, 2],
      income_per_hour: 600, // $10/minute with 5-10min cooldowns
      examples: ["pickpocket", "shoplifting"],
    },
    AMATEUR_CRIMES: {
      difficulty_range: [3, 4], 
      income_per_hour: 1800, // $30/minute with 15-30min cooldowns
      examples: ["car_theft", "credit_card_fraud"],
    },
    PROFESSIONAL_CRIMES: {
      difficulty_range: [5, 6],
      income_per_hour: 3600, // $60/minute with 30-60min cooldowns
      examples: ["burglary", "store_robbery"],
    },
    EXPERT_CRIMES: {
      difficulty_range: [7, 8],
      income_per_hour: 6000, // $100/minute with longer cooldowns
      examples: ["hacking", "organized_crime"],
    },
    MASTER_CRIMES: {
      difficulty_range: [9, 10],
      income_per_hour: 12000, // $200/minute with 2+ hour cooldowns
      examples: ["bank_robbery", "casino_heist"],
    },
  },

  // Item value should be based on how much extra money they help you make
  ITEM_VALUE_CALCULATION: {
    // How many successful crimes an item should pay for itself
    PAYBACK_PERIOD_CRIMES: {
      common: 15,    // Should pay for itself after 15 successful crimes
      uncommon: 25,  // 25 crimes
      rare: 40,      // 40 crimes  
      epic: 60,      // 60 crimes
      legendary: 100, // 100 crimes - true end-game investment
    },
    
    // Bonus value multipliers for different effects
    SUCCESS_RATE_VALUE: 2000, // Each 1% success rate bonus = $2000 value
    REWARD_BONUS_VALUE: 1000,  // Each 1% reward bonus = $1000 value
    COOLDOWN_REDUCTION_VALUE: 500, // Each 1% cooldown reduction = $500 value
    REQUIRED_ITEM_MULTIPLIER: 3.0, // Items required for crimes cost 3x more
  },

  // Market economics for different item types
  ITEM_TYPE_ECONOMICS: {
    tool: {
      base_markup: 1.5,  // 50% shop markup (tools are investments)
      depreciation_rate: 0.02, // 2% value loss per use due to wear
      repair_cost_ratio: 0.15, // 15% of value to fully repair
      durability_factor: 1.0, // Standard durability
    },
    consumable: {
      base_markup: 2.0,  // 100% markup (consumables are instant use)
      stack_limit: 20,   // Maximum inventory
      market_volatility: 0.1, // ±10% price variation
    },
    trade_good: {
      base_markup: 1.2,  // 20% markup (speculative investments)
      market_volatility: 0.3, // ±30% price swings
      seasonal_modifier: 1.0, // Event-based price changes
    },
    collectible: {
      base_markup: 1.8,  // 80% markup (luxury items)
      appreciation_rate: 0.01, // 1% weekly value increase
      set_bonus_multiplier: 2.0, // Complete sets worth 2x individual pieces
    },
  },

  // Progression gates - what players need to afford at each tier
  PROGRESSION_GATES: {
    TIER_1: { // Levels 1-5: Street Criminal
      max_item_cost: 2500,
      typical_income: 600, // per hour
      focus: "Basic tools for petty crimes",
      required_wealth: 5000,
    },
    TIER_2: { // Levels 6-10: Professional Thief  
      max_item_cost: 10000,
      typical_income: 1800,
      focus: "Specialized equipment for theft",
      required_wealth: 25000,
    },
    TIER_3: { // Levels 11-15: Crime Professional
      max_item_cost: 30000, 
      typical_income: 3600,
      focus: "Advanced tools for organized crime",
      required_wealth: 75000,
    },
    TIER_4: { // Levels 16-20: Crime Boss
      max_item_cost: 75000,
      typical_income: 6000,
      focus: "Elite equipment and weapons",
      required_wealth: 200000,
    },
    TIER_5: { // Levels 21+: Crime Lord
      max_item_cost: 200000,
      typical_income: 12000,
      focus: "Legendary items and empire building",
      required_wealth: 500000,
    },
  },
};

// === GAMEPLAY-BASED PRICING FORMULAS ===
export class GameplayEconomyCalculator {
  /**
   * Calculate item value based on actual gameplay impact
   */
  static calculateItemValue(
    itemType: string,
    rarity: string,
    crimeBonus: Record<string, number> = {},
    requiredForCrimes: string[] = [],
    tierLevel: number = 1
  ): number {
    const config = ECONOMY_CONFIG.ITEM_VALUE_CALCULATION;
    const paybackPeriod = config.PAYBACK_PERIOD_CRIMES[rarity as keyof typeof config.PAYBACK_PERIOD_CRIMES] || 20;
    
    // Calculate the average crime income this item affects
    let affectedCrimeIncome = 0;
    let maxBonus = 0;
    
    // Get maximum bonus percentage
    if (Object.keys(crimeBonus).length > 0) {
      maxBonus = Math.max(...Object.values(crimeBonus));
      
      // Estimate income based on tier level
      const tierIncome = this.getTierIncomeRate(tierLevel);
      affectedCrimeIncome = tierIncome;
    }
    
    // Base value calculation: How much extra income over payback period
    let baseValue = 0;
    if (maxBonus > 0) {
      // Extra income per hour from success rate bonus
      const extraIncomePerHour = affectedCrimeIncome * maxBonus;
      // Value = extra income over reasonable payback period
      baseValue = extraIncomePerHour * (paybackPeriod / 10); // Assume 10 crimes per hour
    }
    
    // Required items cost significantly more (scarcity premium)
    if (requiredForCrimes.length > 0) {
      baseValue *= config.REQUIRED_ITEM_MULTIPLIER;
    }
    
    // Type-specific adjustments
    const typeMultipliers = {
      tool: 1.0,       // Tools are investments
      consumable: 0.3,  // Consumables are one-time use
      trade_good: 0.8,  // Trade goods are speculative  
      collectible: 1.5, // Collectibles are luxury/status
    };
    
    baseValue *= typeMultipliers[itemType as keyof typeof typeMultipliers] || 1.0;
    
    // Minimum values based on tier
    const minimumValues = {
      common: tierLevel * 100,
      uncommon: tierLevel * 300,
      rare: tierLevel * 800,
      epic: tierLevel * 2000,
      legendary: tierLevel * 5000,
    };
    
    const minValue = minimumValues[rarity as keyof typeof minimumValues] || 100;
    
    return Math.max(Math.round(baseValue), minValue);
  }
  
  /**
   * Get expected income rate for tier level
   */
  private static getTierIncomeRate(tierLevel: number): number {
    const incomeRates = ECONOMY_CONFIG.CRIME_INCOME_RATES;
    
    if (tierLevel <= 2) return incomeRates.BEGINNER_CRIMES.income_per_hour;
    if (tierLevel <= 4) return incomeRates.AMATEUR_CRIMES.income_per_hour;
    if (tierLevel <= 6) return incomeRates.PROFESSIONAL_CRIMES.income_per_hour;
    if (tierLevel <= 8) return incomeRates.EXPERT_CRIMES.income_per_hour;
    return incomeRates.MASTER_CRIMES.income_per_hour;
  }
  
  /**
   * Calculate shop price (what players pay)
   */
  static calculateShopPrice(baseValue: number, itemType: string): number {
    const markup = ECONOMY_CONFIG.ITEM_TYPE_ECONOMICS[itemType as keyof typeof ECONOMY_CONFIG.ITEM_TYPE_ECONOMICS]?.base_markup || 1.5;
    return Math.round(baseValue * markup);
  }
  
  /**
   * Calculate sale price (what players receive)
   */
  static calculateSalePrice(baseValue: number, condition: number = 1.0): number {
    // Players lose money on resale (realistic market)
    return Math.round(baseValue * 0.6 * condition);
  }
  
  /**
   * Calculate success rate impact on earnings
   */
  static calculateSuccessImpact(
    baseCrimeIncome: number,
    baseSuccessRate: number,
    bonusSuccessRate: number
  ): number {
    const oldExpectedIncome = baseCrimeIncome * baseSuccessRate;
    const newExpectedIncome = baseCrimeIncome * Math.min(0.95, baseSuccessRate + bonusSuccessRate);
    return newExpectedIncome - oldExpectedIncome;
  }
  
  /**
   * Validate if an item price makes sense for player progression
   */
  static validateItemProgression(
    itemValue: number,
    playerLevel: number,
    rarity: string
  ): {
    affordable: boolean;
    recommendation: string;
    tier: string;
  } {
    const expectedWealth = ECONOMY_CONFIG.PLAYER_PROGRESSION.EXPECTED_WEALTH_BY_LEVEL;
    const playerWealth = expectedWealth[playerLevel as keyof typeof expectedWealth] || expectedWealth[30];
    
    // Item should cost 5-20% of player's expected wealth for their level
    const affordabilityRatios = {
      common: 0.05,    // 5% of wealth
      uncommon: 0.10,  // 10% of wealth
      rare: 0.15,      // 15% of wealth  
      epic: 0.25,      // 25% of wealth
      legendary: 0.40, // 40% of wealth
    };
    
    const expectedRatio = affordabilityRatios[rarity as keyof typeof affordabilityRatios] || 0.15;
    const actualRatio = itemValue / playerWealth;
    
    // Find appropriate tier
    let tier = "TIER_1";
    for (const [tierName, tierData] of Object.entries(ECONOMY_CONFIG.PROGRESSION_GATES)) {
      if (itemValue <= tierData.max_item_cost) {
        tier = tierName;
        break;
      }
    }
    
    return {
      affordable: actualRatio <= expectedRatio * 1.5, // 50% tolerance
      recommendation: actualRatio > expectedRatio * 1.5 
        ? `Too expensive for level ${playerLevel}. Should cost ~$${Math.round(playerWealth * expectedRatio)}`
        : actualRatio < expectedRatio * 0.5
        ? `Too cheap for ${rarity} rarity. Could cost ~$${Math.round(playerWealth * expectedRatio)}`
        : "Well-balanced for progression",
      tier: tier,
    };
  }
}

// === BALANCE VALIDATION ===
export const BALANCE_RULES = {
  // Economic health checks
  MAX_INFLATION_RATE: 0.05, // 5% per week
  MIN_DEFLATION_RATE: -0.03, // -3% per week
  
  // Item balance rules
  MAX_CRIME_BONUS_SINGLE_ITEM: 0.25, // 25% max bonus from one item
  MAX_COMBINED_BONUSES: 0.6, // 60% max total bonuses
  
  // Progression validation
  MIN_DIFFICULTY_REWARD_INCREASE: 1.5, // Each level should give 50% more rewards
  MAX_POWER_CREEP_PER_LEVEL: 0.1, // 10% power increase per player level
};

// === ECONOMY EVENTS ===
export const ECONOMY_EVENTS = {
  MARKET_CRASH: {
    frequency: "monthly",
    item_value_multiplier: 0.6,
    duration_days: 3,
    affected_types: ["trade_good", "collectible"],
  },
  CRIME_WAVE: {
    frequency: "weekly", 
    success_rate_bonus: 0.1,
    heat_generation_multiplier: 1.5,
    duration_hours: 24,
  },
  POLICE_CRACKDOWN: {
    frequency: "bi_weekly",
    success_rate_penalty: 0.15,
    jail_time_multiplier: 2.0,
    duration_hours: 48,
  },
};
