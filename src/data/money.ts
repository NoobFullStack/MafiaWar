export interface CryptoCoin {
  id: string;
  name: string;
  symbol: string;
  description: string;
  basePrice: number; // Starting price in USD
  volatility: number; // 0.1 = low volatility, 0.5 = high volatility
  category: "stable" | "volatile" | "meme" | "game";
  launchLevel?: number; // Player level when coin becomes available
}

export interface CryptoMarketData {
  coinId: string;
  currentPrice: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume24h: number;
  lastUpdated: Date;
}

export interface MoneyEventTemplate {
  id: string;
  type: "government" | "market" | "player";
  name: string;
  description: string;
  probability: number; // 0.0 to 1.0
  cooldown: number; // hours between possible occurrences
  effects: {
    cashMultiplier?: number; // 0.7 = lose 30% of cash
    bankMultiplier?: number; // 0.8 = lose 20% of bank funds
    cryptoMultiplier?: number; // 1.2 = gain 20% crypto value
    duration?: number; // hours the effect lasts
  };
  requirements?: {
    minLevel?: number;
    minMoney?: number;
    hasBank?: boolean;
    hasCrypto?: boolean;
  };
}

// Cryptocurrency definitions
export const cryptoCoins: CryptoCoin[] = [
  {
    id: "bitcoin",
    name: "Bitcoin",
    symbol: "BTC",
    description:
      "The original cryptocurrency. Most stable but lower potential gains.",
    basePrice: 45000,
    volatility: 0.15,
    category: "stable",
    launchLevel: 1,
  },
  {
    id: "ethereum",
    name: "Ethereum",
    symbol: "ETH",
    description:
      "Smart contract platform. Moderate volatility and growth potential.",
    basePrice: 3000,
    volatility: 0.25,
    category: "stable",
    launchLevel: 3,
  },
  {
    id: "dogecoin",
    name: "Dogecoin",
    symbol: "DOGE",
    description: "Meme coin with extreme volatility. High risk, high reward.",
    basePrice: 0.25,
    volatility: 0.45,
    category: "meme",
    launchLevel: 5,
  },
  {
    id: "mafiacoin",
    name: "MafiaCoin",
    symbol: "MAFIA",
    description:
      "Game-specific currency. Affected by player actions and gang wars.",
    basePrice: 10,
    volatility: 0.35,
    category: "game",
    launchLevel: 8,
  },
  {
    id: "crimechain",
    name: "CrimeChain",
    symbol: "CRIME",
    description: "Underground currency for illegal activities. Very volatile.",
    basePrice: 50,
    volatility: 0.5,
    category: "volatile",
    launchLevel: 12,
  },
];

// Money-related random events
export const moneyEvents: MoneyEventTemplate[] = [
  // Government Events
  {
    id: "irs_audit",
    type: "government",
    name: "IRS Audit",
    description:
      "The IRS is investigating your financial activities. Bank funds temporarily frozen.",
    probability: 0.08, // 8% chance per week
    cooldown: 168, // 1 week
    effects: {
      bankMultiplier: 0.85, // Lose 15% of bank funds
      duration: 24, // 24 hours
    },
    requirements: {
      minLevel: 5,
      hasBank: true,
      minMoney: 10000,
    },
  },
  {
    id: "asset_forfeiture",
    type: "government",
    name: "Civil Asset Forfeiture",
    description:
      "Police seized your assets under suspicion of criminal activity.",
    probability: 0.05, // 5% chance per week
    cooldown: 336, // 2 weeks
    effects: {
      cashMultiplier: 0.7, // Lose 30% of cash
      bankMultiplier: 0.9, // Lose 10% of bank funds
    },
    requirements: {
      minLevel: 10,
      minMoney: 50000,
    },
  },
  {
    id: "bank_investigation",
    type: "government",
    name: "Bank Investigation",
    description:
      "Your bank is under federal investigation. Withdrawal limits imposed.",
    probability: 0.06, // 6% chance per week
    cooldown: 168, // 1 week
    effects: {
      duration: 48, // 48 hours of limited access
    },
    requirements: {
      minLevel: 8,
      hasBank: true,
    },
  },

  // Market Events
  {
    id: "crypto_bull_run",
    type: "market",
    name: "Crypto Bull Run",
    description:
      "Cryptocurrency markets are surging! All coins increase in value.",
    probability: 0.15, // 15% chance per week
    cooldown: 72, // 3 days
    effects: {
      cryptoMultiplier: 1.3, // 30% increase
      duration: 12, // 12 hours
    },
    requirements: {
      hasCrypto: true,
    },
  },
  {
    id: "market_crash",
    type: "market",
    name: "Market Crash",
    description: "The crypto market is in freefall! Coin values plummeting.",
    probability: 0.12, // 12% chance per week
    cooldown: 120, // 5 days
    effects: {
      cryptoMultiplier: 0.7, // 30% decrease
      duration: 8, // 8 hours
    },
    requirements: {
      hasCrypto: true,
    },
  },
  {
    id: "new_coin_launch",
    type: "market",
    name: "New Coin Launch",
    description:
      "A promising new cryptocurrency just launched! Early investment opportunity.",
    probability: 0.1, // 10% chance per week
    cooldown: 504, // 3 weeks
    effects: {
      // Special event - enables temporary new coin investment
      duration: 72, // 3 days to invest
    },
    requirements: {
      minLevel: 15,
    },
  },

  // Player-triggered Events (from gang wars, major crimes, etc.)
  {
    id: "gang_war_economy",
    type: "player",
    name: "Gang War Economic Impact",
    description: "Major gang conflicts are affecting the underground economy.",
    probability: 0.2, // 20% chance when gang wars occur
    cooldown: 48, // 2 days
    effects: {
      cryptoMultiplier: 0.9, // 10% decrease in crypto
      duration: 24, // 24 hours
    },
    requirements: {
      minLevel: 10,
    },
  },
];

// Bank access levels and their benefits
export interface BankTier {
  level: number;
  name: string;
  requirements: {
    minLevel: number;
    minMoney: number;
    reputation?: number;
  };
  benefits: {
    withdrawalLimit: number; // per day
    interestRate: number; // daily rate
    withdrawalFee: number; // percentage
    protectionLevel: number; // resistance to government seizure
  };
  upgradeCost: number;
}

export const bankTiers: BankTier[] = [
  {
    level: 1,
    name: "Basic Account",
    requirements: {
      minLevel: 1,
      minMoney: 0,
    },
    benefits: {
      withdrawalLimit: 5000,
      interestRate: 0.001, // 0.1% daily
      withdrawalFee: 0.05, // 5%
      protectionLevel: 0, // No protection
    },
    upgradeCost: 0,
  },
  {
    level: 2,
    name: "Premium Account",
    requirements: {
      minLevel: 5,
      minMoney: 25000,
    },
    benefits: {
      withdrawalLimit: 15000,
      interestRate: 0.002, // 0.2% daily
      withdrawalFee: 0.03, // 3%
      protectionLevel: 0.1, // 10% protection
    },
    upgradeCost: 10000,
  },
  {
    level: 3,
    name: "VIP Account",
    requirements: {
      minLevel: 10,
      minMoney: 100000,
      reputation: 50,
    },
    benefits: {
      withdrawalLimit: 50000,
      interestRate: 0.003, // 0.3% daily
      withdrawalFee: 0.02, // 2%
      protectionLevel: 0.25, // 25% protection
    },
    upgradeCost: 50000,
  },
  {
    level: 4,
    name: "Private Banking",
    requirements: {
      minLevel: 20,
      minMoney: 500000,
      reputation: 150,
    },
    benefits: {
      withdrawalLimit: 200000,
      interestRate: 0.005, // 0.5% daily
      withdrawalFee: 0.01, // 1%
      protectionLevel: 0.4, // 40% protection
    },
    upgradeCost: 200000,
  },
  {
    level: 5,
    name: "Offshore Account",
    requirements: {
      minLevel: 30,
      minMoney: 2000000,
      reputation: 300,
    },
    benefits: {
      withdrawalLimit: 1000000,
      interestRate: 0.007, // 0.7% daily
      withdrawalFee: 0.005, // 0.5%
      protectionLevel: 0.6, // 60% protection
    },
    upgradeCost: 1000000,
  },
];

// Exchange rates and fees for crypto trading
export interface ExchangeRate {
  fromCurrency: "cash" | "bank" | string; // string for crypto coins
  toCurrency: "cash" | "bank" | string;
  baseFee: number; // percentage
  minAmount: number;
  maxAmount: number;
}

export const exchangeRates: ExchangeRate[] = [
  // Cash to Crypto
  {
    fromCurrency: "cash",
    toCurrency: "bitcoin",
    baseFee: 0.02, // 2%
    minAmount: 100,
    maxAmount: 100000,
  },
  {
    fromCurrency: "cash",
    toCurrency: "ethereum",
    baseFee: 0.025, // 2.5%
    minAmount: 50,
    maxAmount: 50000,
  },
  // Higher fees for more volatile coins
  {
    fromCurrency: "cash",
    toCurrency: "dogecoin",
    baseFee: 0.05, // 5%
    minAmount: 10,
    maxAmount: 10000,
  },
  {
    fromCurrency: "cash",
    toCurrency: "mafiacoin",
    baseFee: 0.03, // 3%
    minAmount: 25,
    maxAmount: 25000,
  },
  {
    fromCurrency: "cash",
    toCurrency: "crimechain",
    baseFee: 0.07, // 7%
    minAmount: 100,
    maxAmount: 20000,
  },
];
