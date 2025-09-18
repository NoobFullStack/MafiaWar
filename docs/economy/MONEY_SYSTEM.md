# 💰 Multi-Layered Money System

## 🎯 System Overview

MafiaWar implements a sophisticated **three-tier money system** that adds strategic risk management to gameplay. Players must decide where to store their money based on different threat models and accessibility needs.

### 💵 Cash (On Hand)

- **Risk**: Can be stolen by other players during robberies
- **Access**: Immediate use for crimes, purchases, gang activities
- **Security**: None - highest vulnerability
- **Best For**: Daily operations, small amounts, immediate needs

### 🏦 Bank Account

- **Risk**: Subject to IRS raids, police seizures (random events)
- **Access**: Requires bank visit commands with small fees
- **Security**: Protected from player theft, not government actions
- **Features**: 5 bank tiers with different benefits and withdrawal limits
- **Best For**: Medium-term storage, protecting from other players

### ₿ Cryptocurrency Portfolio

- **Risk**: Market volatility - value fluctuates based on market simulation
- **Access**: Convert to cash with exchange fees and market rates
- **Security**: Protected from both players and government
- **Features**: 5 different cryptocurrencies with varying volatility profiles
- **Best For**: Long-term storage, potential growth, maximum security

## 🎮 Strategic Integration Status

### ✅ **Fully Implemented Features**

#### **Strategic Crime Payouts**
- **Payment Types**: Crimes can pay in cash, bank, crypto, or mixed combinations
- **Smart Examples**:
  - **Bank Robbery**: Mixed payout (60% cash + 40% bank for money laundering)
  - **Cyber Hacking**: Crypto payout (untraceable digital theft)
  - **Regular Crimes**: Default cash payments (immediate street earnings)
- **Player Messaging**: Clear explanations of payout methods and reasoning

#### **Strategic Item Purchasing**  
- **Payment Requirements**: Items can require specific payment methods
- **Smart Examples**:
  - **Hacking Laptop**: Requires crypto (dark web purchase)
  - **Cheap Pistol**: Requires cash (street dealer, no paper trail)
  - **Gold Watch**: Requires bank transfer (luxury auction)
  - **Mafia Ring**: Requires bank verification (exclusive auction house)

#### **System Integration**
- **CrimeService**: Updated to use new money system with strategic payouts
- **MoneyService**: Optimized with input validation and error handling
- **Commands**: All money-related commands fully integrated

## 🎮 Implemented Commands

### `/wallet` - Portfolio Overview

View your complete financial portfolio:

- Total net worth calculation
- Cash, bank, and crypto breakdown
- Risk warnings for each tier
- Current crypto market values

### `/bank` - Banking Operations

- **`/bank deposit <amount>`** - Move cash to bank account
- **`/bank withdraw <amount>`** - Get cash from bank (with fees)
- **`/bank info`** - View account details and upgrade options
- **`/bank upgrade`** - Upgrade to higher bank tier (planned)

## 🏦 Bank Tier System

| Tier | Name             | Benefits                      | Upgrade Cost |
| ---- | ---------------- | ----------------------------- | ------------ |
| 1    | Basic Checking   | 2% withdrawal fee, $10K limit | Free         |
| 2    | Premium Account  | 1.5% fee, $25K limit          | $5,000       |
| 3    | Business Account | 1% fee, $50K limit            | $15,000      |
| 4    | Private Banking  | 0.5% fee, $100K limit         | $50,000      |
| 5    | Offshore Account | 0.1% fee, unlimited           | $200,000     |

## ₿ Cryptocurrency System

### Available Cryptocurrencies

| Coin       | Symbol | Type   | Volatility | Description                           |
| ---------- | ------ | ------ | ---------- | ------------------------------------- |
| Bitcoin    | BTC    | Stable | Low        | Most stable, lower gains              |
| Ethereum   | ETH    | Stable | Low-Medium | Smart contracts platform              |
| Litecoin   | LTC    | Stable | Medium     | Silver to Bitcoin's gold              |
| DogeCoin   | DOGE   | Meme   | High       | High volatility meme coin             |
| CrimeChain | CRIME  | Game   | Extreme    | In-game currency, highest risk/reward |

### Market Mechanics

- **Daily Updates**: Prices fluctuate based on volatility settings
- **Exchange Fees**: 2-5% depending on coin type
- **Market Events**: Random crashes and bull runs affect all coins
- **Realistic Pricing**: Based on actual crypto market patterns

## 🎲 Random Events System

### Government Events

- **IRS Audit**: 10-30% of bank funds frozen/seized
- **Police Raid**: Confiscate cash and partial bank funds
- **Money Laundering Investigation**: Bank access temporarily restricted

### Market Events

- **Crypto Crash**: All cryptocurrencies lose 20-50% value
- **Bull Market**: Cryptocurrencies gain 15-40% value
- **Individual Coin Events**: Specific coins experience major changes

### Player Events

- **Theft Protection**: Higher-level players can attempt to steal cash
- **Investment Opportunities**: Special events for profitable crypto trades

## 📊 Strategic Gameplay

### Risk-Reward Balance

Players must constantly evaluate:

- **Immediate Liquidity** vs **Security Protection**
- **Government Threats** vs **Player Threats**
- **Stability** vs **Growth Potential**

### Decision Matrix

| Scenario                | Recommended Storage              |
| ----------------------- | -------------------------------- |
| Active criminal         | Keep minimal cash, rest in bank  |
| High-level target       | Diversify across all three tiers |
| Bull market signals     | Increase crypto allocation       |
| Government event rumors | Reduce bank, increase crypto     |
| Need quick access       | Maintain cash reserves           |

### Strategic Decision Examples

#### **Scenario 1: Planning a Cyber Crime**
1. Player wants to buy Hacking Laptop (requires crypto)
2. Must have cryptocurrency or convert cash → crypto (with fees)
3. Successfully commit cyber hacking crime
4. Earnings automatically converted to crypto (untraceable)
5. Can reinvest in more crypto-based items

#### **Scenario 2: Street-Level Criminal**
1. Player wants weapons for robberies (requires cash)
2. Keeps earnings in cash for immediate weapon purchases
3. Risk: More vulnerable to player theft
4. Benefit: No conversion fees for street purchases

#### **Scenario 3: High-Society Criminal**
1. Player wants luxury collectibles (requires bank transfer)
2. Must maintain bank account with sufficient funds
3. Risk: Bank funds vulnerable to government seizures
4. Benefit: Access to exclusive high-value items

## 🎯 Player Strategy Guide

### Storage Strategy by Player Type

Players should choose storage based on their risk tolerance and play style:

| Storage Type | Risk              | Protection       | Best For            |
| ------------ | ----------------- | ---------------- | ------------------- |
| 💵 Cash      | Player theft      | None             | Daily operations    |
| 🏦 Bank      | Government raids  | From players     | Medium-term savings |
| ₿ Crypto     | Market volatility | From all threats | Long-term storage   |

### Command Strategy

- **Portfolio Overview**: Use `/wallet` for complete portfolio with strategy analysis
- **Banking Operations**: Use `/bank deposit 1000` to secure money from players
- **Market Timing**: Monitor crypto prices before major conversions

### Economic Benefits

- **Strategic Depth**: Risk management decisions affect long-term success
- **Protection Options**: Multiple defenses against different threat types
- **Growth Potential**: Cryptocurrency investments can multiply wealth
- **Income Diversification**: Different crimes provide different payment types

### Gameplay Impact

- **Decision Consequences**: Money storage choices have lasting effects
- **Threat Modeling**: Different crimes target different money types
- **Market Dynamics**: Economic uncertainty creates strategic opportunities
- **Portfolio Management**: Diversification becomes a valuable skill

## 🔧 Technical Implementation

### Database Schema (Updated Architecture)

```sql
-- NEW: Dedicated currency tables (normalized)
model CurrencyBalance {
  id              String   @id @default(uuid())
  userId          String   
  currencyType    String   // "cash", "bank", "crypto"
  coinType        String?  // For crypto: "bitcoin", "ethereum", etc. NULL for cash/bank
  amount          Float    // Support both integer (cash/bank) and decimal (crypto) amounts
  lastUpdated     DateTime @default(now()) @updatedAt
  
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, currencyType, coinType])
  @@index([userId, currencyType])
}

model BankingProfile {
  id              String   @id @default(uuid())
  userId          String   @unique
  accessLevel     Int      @default(1)
  lastVisit       DateTime?
  interestAccrued Float    @default(0)
  
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

-- LEGACY: Character money fields (maintained for backward compatibility)
cashOnHand     INT DEFAULT 0      -- Immediate access, theft risk
bankBalance    INT DEFAULT 0      -- Protected from players
cryptoWallet   JSON DEFAULT '{}'  -- Protected from all threats
bankAccessLevel INT DEFAULT 1     -- Current bank tier (1-5)

-- Supporting tables (unchanged)
CryptoPrice    -- Real-time market data
MoneyEvent     -- Random events log
BankTransaction -- Audit trail
CryptoTransaction -- Trading history
```

### MoneyServiceV2 API (Hybrid System)

The new service provides:
- **Hybrid Read**: Automatically reads from new tables if available, falls back to Character columns
- **Smart Write**: Detects migration state and writes to appropriate storage
- **Zero Downtime**: Seamless operation during migration process
- **Full Compatibility**: All existing APIs preserved

Core methods:
- `getUserBalance()` - Complete portfolio overview with hybrid read
- `transferMoney()` - Move between cash/bank/crypto with smart storage
- `buyCrypto()` / `sellCrypto()` - Cryptocurrency trading with hybrid support
- `addMoney()` - Direct currency additions with type safety
- `processRandomEvent()` - Handle market/government events
- `getBankTierInfo()` - Banking upgrade information

### Migration Status

- ✅ **Schema Ready**: New tables defined and deployable
- ✅ **Code Migrated**: All financial operations use MoneyServiceV2
- ✅ **Backward Compatible**: Automatic fallback to Character columns
- ✅ **Zero Risk**: Transaction-safe migration with rollback capability
- 🔄 **Production Ready**: Awaiting deployment approval

## 🚀 Future Enhancements

### Planned Features

- **Crypto Trading Pairs**: Trade between different cryptocurrencies
- **Bank Interest**: Earn passive income on bank deposits
- **Automated Events**: Scheduled random events with notifications
- **Portfolio Analytics**: Historical tracking and performance metrics
- **Insurance System**: Protect against specific types of losses
- **Loan System**: Borrow against cryptocurrency holdings

### Integration Points

- **Crime System**: Different crimes may target different money types
- **Asset System**: Properties may generate income in specific currencies
- **Gang System**: Shared treasuries with multi-tier management
- **Achievement System**: Rewards for financial milestones and risk management
  bankBalance Int @default(0) // Vulnerable to government
  cryptoWallet Json @default("{}") // {"bitcoin": 1.5, "ethereum": 0.8}
  lastBankVisit DateTime?
  bankAccessLevel Int @default(1) // Unlocks higher limits
  }

model CryptoPrice {
id String @id @default(uuid())
coinType String // "bitcoin", "ethereum", "dogecoin"
price Float // Current USD value
change24h Float // Percentage change
updatedAt DateTime @default(now())
}

model MoneyEvent {
id String @id @default(uuid())
userId String
eventType String // "theft", "irs_raid", "market_change"
amount Int
details Json // Additional event data
timestamp DateTime @default(now())
user User @relation(fields: [userId], references: [id])
}

```

### Crypto System
- **Supported Coins**: Bitcoin, Ethereum, DogeCoin, MafiaToken (game currency)
- **Price Updates**: Daily fluctuations based on real crypto trends + game events
- **Exchange Fees**: 2-5% for conversions
- **Volatility**: ±10-30% daily swings for excitement

### Banking System
- **Withdrawal Limits**: Based on bank access level and current events
- **Interest Rates**: 0.1-0.5% daily on banked funds
- **Government Events**: 5-15% chance weekly of seizure events
- **Bank Upgrades**: Higher levels = better protection, lower fees

## 🎲 Random Events

### Government Crackdowns
- **IRS Audit**: 10-30% of bank funds frozen for 24-48 hours
- **Asset Forfeiture**: Government seizes percentage of all non-crypto funds
- **Bank Investigation**: Temporary withdrawal limits imposed

### Market Events
- **Crypto Bull Run**: All crypto values increase 20-50%
- **Market Crash**: Crypto values drop 15-40%
- **New Coin Launch**: Opportunity to invest early in volatile new currency

### Player Interactions
- **Street Robberies**: Players can target others' cash during crimes
- **Asset Heists**: Rob buildings to steal owner's accessible funds
- **Gang Raids**: Coordinated attacks on rival gang treasuries

## 💡 Strategic Gameplay

### Money Management Strategies
1. **High-Risk High-Reward**: Keep cash for immediate opportunities
2. **Conservative**: Bank majority, small crypto hedge
3. **Speculative**: Heavy crypto investment for growth potential
4. **Balanced**: Diversified across all three systems

### Economic Decisions
- When to bank vs hold cash
- Which crypto to invest in
- How to respond to market volatility
- Risk tolerance during government crackdowns

## 🔧 Commands & Interface

### New Commands
- `/bank deposit <amount>` - Store cash in bank
- `/bank withdraw <amount>` - Get cash from bank (fees apply)
- `/crypto buy <coin> <amount>` - Purchase cryptocurrency
- `/crypto sell <coin> <amount>` - Convert crypto to cash
- `/wallet` - View all money types and portfolio
- `/market` - Check current crypto prices and trends

### Enhanced Balance Command
Show breakdown of:
- Cash on hand (vulnerable)
- Bank balance (government risk)
- Crypto portfolio value (market risk)
- Total net worth

## 📈 Economic Integration

### Crime Rewards
- Small crimes: Mostly cash rewards
- Large heists: Bank deposits or crypto options
- Gang activities: Shared crypto investments

### Asset Income
- Properties generate bank deposits by default
- Players can choose cash or crypto payouts
- Higher-level assets offer crypto investment options

### Market Dynamics
- Crime success affects local "economy"
- Major gang wars influence crypto prices
- Government crackdowns create market volatility

This system creates meaningful choices, adds replayability through market dynamics, and provides multiple risk/reward strategies for different player types.
```
