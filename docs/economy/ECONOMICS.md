# 💰 MafiaWar Economics System

Real gameplay-based economy analysis and balance system.

## 🎯 Quick Commands

```bash
# Analyze complete economy
yarn economy:analyze

# Validate item balance
yarn economy:validate

# Check specific items
yarn economy:validate --item lockpick_basic
```

## 📊 System Overview

The MafiaWar economics system ensures **realistic pricing** based on **actual gameplay value** rather than arbitrary formulas.

### Core Principles

1. **🎮 Gameplay-Based Pricing**: Items cost based on crime earnings, not real-world logic
2. **⏰ Payback Periods**: Items should pay for themselves in 1-5 hours of gameplay
3. **📈 Crime Progression**: Each difficulty tier provides 50%+ more income
4. **🛠️ Meaningful Bonuses**: All tools provide actual gameplay benefits

## 💡 How It Works

### Crime Income Analysis

The system calculates **real hourly income** from crimes:

```
Hourly Income = (Average Reward × Success Rate × Crimes per Hour)
```

**Example**: Pickpocketing
- Reward: $50-200 (avg $125)
- Success: 75%
- Cooldown: 5 minutes (12 crimes/hour)
- **Income**: $125 × 0.75 × 12 = **$1,125/hour**

### Item Value Calculation

Items are priced based on **how long they take to pay for themselves**:

```
Payback Time = Item Cost ÷ Extra Income per Hour
```

**Example**: Basic Lockpick
- Cost: $150
- Bonus: +5% success on theft crimes
- Extra income: ~$250/hour from bonus
- **Payback**: $150 ÷ $250 = **36 minutes** ✅

## 📈 Income Tiers

### Current Crime Progression

| Tier | Difficulty | Income/Hour | Examples |
|------|------------|-------------|----------|
| **Beginner** | 1-2 | $1,028/hr | Pickpocketing, Shoplifting |
| **Amateur** | 3-4 | $1,653/hr | Bike Theft, Car Theft |
| **Professional** | 5-6 | $1,814/hr | Burglary, Store Robbery |
| **Expert** | 7-8 | $1,500/hr | Cyber Hacking |
| **Master** | 9-10 | $1,750/hr | Bank Robbery |

### Ideal Targets
- Each tier should provide **50%+ more income** than previous
- Clear progression incentive for players
- Risk/reward balance with jail time

## 🛠️ Item Balance Guidelines

### Payback Time Targets

| Category | Target Payback | Reasoning |
|----------|----------------|-----------|
| **Basic Tools** | 30-60 minutes | Quick return for early game |
| **Advanced Tools** | 1-3 hours | Significant investment |
| **Weapons** | 2-5 hours | Higher risk/reward |
| **Consumables** | Immediate | Temporary bonuses |

### Balance Status

```bash
yarn economy:analyze
```

**Current Item Analysis**:
- ✅ **Basic Lockpick**: 36min payback (good)
- ✅ **Advanced Lockpick**: 60min payback (good)  
- ✅ **Hacking Laptop**: 2hr payback (good)
- ⚠️ **Crowbar**: 16min payback (maybe too cheap)

## 🎮 Item Types & Bonuses

### Tools
Provide **permanent crime bonuses**:

```typescript
metadata: {
  crimeBonus: {
    pickpocket: 0.05,    // +5% success rate
    burglary: 0.15,      // +15% success rate
  }
}
```

### Consumables
Provide **temporary bonuses**:

```typescript
metadata: {
  crimeBonus: {
    all_crimes: 0.10,        // +10% to all crimes
    duration_minutes: 60,    // Lasts 1 hour
  }
}
```

### Trade Goods & Collectibles
- **No crime bonuses** (pure profit/prestige items)
- Priced for trading/selling mechanics
- Should have clear profit margins

## 🔧 System Architecture

### Core Files

```
src/config/economy.ts           # Economic constants and formulas
src/utils/EconomyAnalyzer.ts    # Analysis and validation tools
src/scripts/economy.ts          # CLI commands
```

### Key Functions

```typescript
// Analyze complete economy
GameplayEconomyAnalyzer.analyzeRealEconomics(items, crimes)

// Validate single item
GameplayEconomyAnalyzer.validateItem(item, crimes)

// Get crime income data
analyzeCrimeIncome(crimes)
```

## 📊 Economy Analysis Output

### Sample Analysis
```
💰 CRIME INCOME ANALYSIS:
Crime                    | Diff | Reward  | Success | Income/Hour
Pickpocketing           |   1  |    $125 |     75% |      $1125
Burglary                |   5  |   $2350 |     60% |      $2115

🛠️ ITEM VALUE ANALYSIS:
Item                     | Cost    | Payback | Status
Basic Lockpick          |    $150 |    36min | ✅ Good
Cheap Pistol            |    $150 |    Never | ❌ Issue

🏥 ECONOMY HEALTH CHECK:
Crime Progression Issues: 2
Item Balance Issues: 3
```

## 🎯 Balance Recommendations

### Automatic Suggestions

The system provides **specific pricing recommendations**:

```
📉 Reduce prices on expensive items:
  Cheap Pistol: $150 → $45

📈 Increase prices on cheap items:
  Crowbar: $75 → $225
```

### Manual Balance Process

1. **Run Analysis**: `yarn economy:analyze`
2. **Identify Issues**: Look for items with >5hr or <30min payback
3. **Adjust Prices**: Update `src/data/items.ts`
4. **Re-analyze**: Verify improvements
5. **Update Database**: `yarn seed --items`

## 🚨 Common Balance Issues

### "Item Never Pays for Itself"
**Problem**: Item provides no crime bonuses
**Solution**: Add meaningful `crimeBonus` metadata

```typescript
// Before: No bonuses
metadata: {
  effects: { health_restore: 50 }
}

// After: Temporary crime bonus
metadata: {
  effects: { health_restore: 50 },
  crimeBonus: {
    all_crimes: 0.05,
    duration_minutes: 15
  }
}
```

### "Item Pays Back Too Fast"
**Problem**: Item too cheap for bonus provided
**Solution**: Increase price or reduce bonus

```typescript
// Too cheap: 15min payback
value: 50,

// Balanced: 60min payback  
value: 200,
```

### "Crime Progression Broken"
**Problem**: Higher difficulty crimes earn less
**Solution**: Increase rewards for higher tiers

```typescript
// Professional crime earning less than Amateur
rewardMin: 800,   // Too low
rewardMax: 2500,

// Fixed: Clear progression
rewardMin: 1200,  // Higher rewards
rewardMax: 3500,
```

## 📈 Economy Monitoring

### Regular Health Checks

```bash
# Weekly economy review
yarn economy:analyze > weekly-report.md

# After adding new content
yarn economy:validate
yarn seed --items
```

### Key Metrics to Watch

1. **Crime Income Progression**: Each tier 50%+ better
2. **Item Payback Times**: 30min - 5hr range
3. **Player Progression**: Clear advancement incentives
4. **Economic Inflation**: Prevent runaway pricing

## 🔗 Integration with Game

### Discord Bot Commands

```typescript
// Players can view item economics
/economy analyze lockpick

// Check crime profitability  
/economy crimes burglary
```

### Database Integration

```typescript
// Items auto-balanced on seed
yarn seed --items

// Crime data validated on startup
yarn economy:validate
```

## 🚀 Future Enhancements

### Planned Features

1. **Dynamic Pricing**: Market-based item costs
2. **Inflation System**: Economy grows with player base
3. **Regional Markets**: Different prices by server
4. **Player Trading**: Real marketplace mechanics

### Advanced Analytics

1. **Player Income Tracking**: Real usage data
2. **Item Popularity Metrics**: What players actually buy
3. **Crime Success Rates**: Real vs predicted outcomes
4. **Economic Impact Analysis**: Balance change effects

## 🔗 Related Documentation

- [Seeding System](./SEEDING.md) - Managing game data
- [Game Design](./development/game-design.md) - Overall mechanics
- [Installation Guide](./setup/INSTALLATION.md) - Project setup
