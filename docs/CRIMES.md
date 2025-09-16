# Crime System Documentation

## Overview

The Mafia War crime system features a carefully balanced progression of 21 different crimes across 6 categories, designed to provide meaningful advancement from street-level petty crimes to elite international operations.

## Balance Philosophy

### Core Principles
- **Risk/Reward Scaling**: Higher difficulty crimes offer exponentially better rewards but with significantly increased jail time and lower success rates
- **Logical Progression**: Each crime tier provides meaningful upgrades over previous tiers
- **Time Investment Rewards**: Longer cooldowns are compensated with better hourly income rates
- **Category Specialization**: Different crime types offer unique payment methods and stat bonuses

### Success Rate Formula
**Formula**: `95% - (difficulty × 8%)`

Success rates decrease linearly as difficulty increases, ensuring even basic crimes carry some risk while elite operations remain extremely challenging.

## Crime Categories & Progression

### 1. Petty Crimes (Level 1-5)
**Philosophy**: Entry-level crimes with high success rates and minimal consequences. Designed for new players to learn the system.

- **Target Audience**: New players (Level 1-5)
- **Success Rate Range**: 95% - 79%
- **Payment Type**: Cash only (immediate street-level transactions)
- **Risk Level**: Very Low

### 2. Theft Crimes (Level 5-10)
**Philosophy**: Property-based crimes requiring more skill and planning. Introduction to moderate risk/reward.

- **Target Audience**: Intermediate players (Level 5-10)
- **Success Rate Range**: 71% - 55%
- **Payment Type**: Cash → Mixed (stolen goods fencing)
- **Risk Level**: Low to Moderate

### 3. White Collar Crimes (Level 8-15)
**Philosophy**: Technology-based crimes with lower violence risk but requiring high intelligence. Premium payment methods.

- **Target Audience**: Tech-focused players (Level 8-15)
- **Success Rate Range**: 71% - 47%
- **Payment Type**: Crypto/Bank (digital theft and fraud)
- **Risk Level**: Moderate (lower injury risk)

### 4. Robbery Crimes (Level 12-20)
**Philosophy**: Violent crimes with high immediate rewards but significant risks including injury and heat generation.

- **Target Audience**: Combat-focused players (Level 12-20)
- **Success Rate Range**: 55% - 39%
- **Payment Type**: Cash → Mixed (laundered proceeds)
- **Risk Level**: High (violence and injury)

### 5. Organized Crimes (Level 18-25)
**Philosophy**: Syndicate-level operations requiring reputation and connections. Massive rewards with complex payment structures.

- **Target Audience**: Established players (Level 18-25)
- **Success Rate Range**: 47% - 31%
- **Payment Type**: Mixed/Bank (laundered business income)
- **Risk Level**: Very High

### 6. Elite Violence Crimes (Level 25-30)
**Philosophy**: The pinnacle of criminal operations. Extreme risk/reward for the most experienced players.

- **Target Audience**: Elite players (Level 25-30)
- **Success Rate Range**: 23% - 15%
- **Payment Type**: Crypto/Mixed (untraceable elite contracts)
- **Risk Level**: Extreme

## Income Distribution

### Reward Scaling Strategy
**Formula**: Exponential scaling based on `difficulty^1.3` with category multipliers

| Category | Level Range | Min Income | Max Income | Multiplier |
|----------|-------------|------------|------------|------------|
| Petty | 1-5 | $50 | $500 | 1.0x |
| Theft | 5-10 | $400 | $2,400 | 2.5x |
| White Collar | 8-15 | $600 | $5,000 | 4.0x |
| Robbery | 12-20 | $800 | $8,000 | 8.0x |
| Organized | 18-25 | $3,000 | $16,000 | 15.0x |
| Elite | 25-30 | $15,000 | $60,000 | 50.0x |

### Income Progression Logic
- **Early Game**: Frequent small amounts for consistent progress
- **Mid Game**: Moderate amounts with reasonable time investment
- **Late Game**: Large amounts requiring significant time and risk

## Jail Time Distribution

### Design Philosophy
- **Maximum Jail Time**: 180 minutes (3 hours) for worst crimes
- **Minimum Jail Time**: 5 minutes maximum for lowest crimes
- **Scaling**: Exponential increase with difficulty
- **Bribe Viability**: All jail times remain reasonable for bribe system

| Crime Tier | Min Jail (min) | Max Jail (min) | Average (min) |
|------------|----------------|----------------|---------------|
| **Petty** | 2 | 20 | 11 |
| **Theft** | 15 | 60 | 37 |
| **White Collar** | 25 | 90 | 57 |
| **Robbery** | 40 | 150 | 95 |
| **Organized** | 75 | 180 | 127 |
| **Elite** | 150 | 180 | 165 |

### Jail Time Progression
- **Pickpocketing**: 2-5 minutes (learning consequences)
- **Mid-tier crimes**: 30-90 minutes (serious but manageable)
- **Elite crimes**: 150-180 minutes (severe but not game-breaking)

## Cooldown System

### Cooldown Philosophy
- **Frequency vs. Reward**: Shorter cooldowns for lower rewards, longer for higher
- **Player Engagement**: Balanced to maintain active gameplay without spam
- **Progression Incentive**: Higher-tier crimes offer better hourly rates despite longer cooldowns

| Category | Cooldown Range | Hourly Rate Logic |
|----------|----------------|-------------------|
| **Petty** | 2-10 minutes | High frequency, low individual rewards |
| **Theft** | 15-30 minutes | Moderate frequency, decent rewards |
| **White Collar** | 25-60 minutes | Tech complexity requires time |
| **Robbery** | 35-80 minutes | Planning and execution time |
| **Organized** | 60-100 minutes | Complex multi-step operations |
| **Elite** | 120-180 minutes | Rare, high-value operations |

### Optimal Play Patterns
- **New Players**: Can commit crimes every 2-10 minutes
- **Intermediate Players**: 30-60 minute cycles with better rewards
- **Advanced Players**: 1-3 hour cycles with massive payouts

## XP Reward System

### XP Philosophy
- **Skill Development**: XP reflects time investment and difficulty mastery
- **Progression Pacing**: Balanced to provide steady character advancement
- **Risk Compensation**: Higher-risk crimes provide proportionally more XP

| Level Range | XP Range | XP per Hour | Progression Rate |
|-------------|----------|-------------|------------------|
| **1-5** | 5-20 XP | 15-120/hour | Fast (learning) |
| **5-10** | 30-60 XP | 60-120/hour | Steady |
| **12-18** | 65-120 XP | 80-150/hour | Moderate |
| **18-25** | 90-150 XP | 90-150/hour | Steady |
| **25-30** | 200-280 XP | 100-140/hour | Slow (mastery) |

### XP Scaling Strategy
**Formula**: `(difficulty × 20) + (cooldown_minutes ÷ 20)`
- Base XP scales with difficulty
- Time investment bonus for longer operations
- Diminishing returns at elite levels to prevent power gaming

## Payment Type Strategy

### Payment Method Logic
Each payment type serves specific gameplay and narrative purposes:

#### Cash Payments
- **Usage**: Street-level crimes, immediate transactions
- **Crimes**: Petty crimes, mugging, drug dealing
- **Advantage**: Immediate availability, no processing time
- **Disadvantage**: Easily trackable, no additional benefits

#### Bank Payments
- **Usage**: Legitimate business fronts, laundered money
- **Crimes**: Identity theft, money laundering, extortion
- **Advantage**: Appears legitimate, harder to trace
- **Disadvantage**: Processing delays, potential freezing

#### Crypto Payments
- **Usage**: Tech crimes, elite contracts
- **Crimes**: Hacking, credit card fraud, assassination
- **Advantage**: Untraceable, international transfers
- **Disadvantage**: Market volatility, technical complexity

#### Mixed Payments
- **Usage**: Complex operations with multiple revenue streams
- **Crimes**: Burglary, bank robbery, heists, cartels
- **Advantage**: Diversified risk, multiple income sources
- **Disadvantage**: Complex processing, varied timing

## Stat Bonus Distribution

### Stat Requirements by Category
- **Stealth**: Crucial for theft and white-collar crimes
- **Strength**: Essential for violent robberies and organized crime
- **Intelligence**: Key for white-collar and elite operations

### Optimal Stat Builds
- **Stealth Build**: Theft → White Collar → Elite (Assassination)
- **Strength Build**: Petty → Robbery → Organized (Physical intimidation)
- **Intelligence Build**: White Collar → Organized (Money laundering) → Elite
- **Balanced Build**: Flexible progression through all categories

## Risk Factors

### Injury System
- **Philosophy**: Violent crimes carry physical risk
- **Scaling**: 5% (vandalism) → 45% (cartel operations)
- **Impact**: Temporary stat reduction, medical costs

### Heat Generation
- **Philosophy**: High-profile crimes attract law enforcement attention
- **Scaling**: 2 (mugging) → 12 (cartel operations)
- **Impact**: Increased jail times, reduced success rates

## Game Balance Metrics

### Hourly Income Potential
| Level Range | Low-Risk Strategy | High-Risk Strategy |
|-------------|-------------------|-------------------|
| **1-5** | $150-300/hour | $200-400/hour |
| **5-10** | $800-1,200/hour | $1,200-2,000/hour |
| **12-18** | $2,000-4,000/hour | $4,000-8,000/hour |
| **18-25** | $5,000-10,000/hour | $8,000-15,000/hour |
| **25-30** | $15,000-25,000/hour | $20,000-40,000/hour |

### Risk vs. Reward Analysis
- **Conservative Play**: Consistent income with minimal jail time
- **Aggressive Play**: Higher income potential with significant risk
- **Optimal Strategy**: Mixed approach based on player's online time and risk tolerance

## Future Considerations

### Potential Expansions
- **Seasonal Events**: Limited-time high-reward crimes
- **Territory System**: Location-based crime modifiers
- **Crew Operations**: Multi-player coordinated crimes
- **Equipment System**: Tools that modify success rates and rewards

### Balance Monitoring
- **Success Rate Tracking**: Ensure intended difficulty curves
- **Economy Impact**: Monitor inflation and income distribution
- **Player Progression**: Validate advancement pacing
- **Engagement Metrics**: Optimize cooldowns for active play

---

*This documentation reflects the current balance as of the comprehensive crime system rewrite. All values are subject to ongoing balance adjustments based on player feedback and game economy health.*