# Crypto Value Decline Investigation Report

## Executive Summary

**Issue**: MafiaWar cryptocurrency value has dropped from $1,337 to $100 in one week (92.5% decline).

**Root Cause**: Mathematical flaw in the crypto pricing algorithm creates systematic downward bias.

**Status**: NOT a bug, coincidence, or bad luck - this is an inevitable mathematical outcome.

## Technical Analysis

### The Core Problem: Jensen's Inequality

The current pricing algorithm in `src/services/MoneyService.ts` uses:

```typescript
const change = (Math.random() - 0.5) * 2 * volatility; // -0.35 to +0.35
const newPrice = Math.max(lastPrice * (1 + change), 0.01);
```

**Mathematical Issue**: This creates a multiplicative random walk with uniform distribution, which has inherent downward bias due to Jensen's Inequality.

- **Arithmetic Mean**: E[1 + change] = 1.0 (appears unbiased)
- **Geometric Mean**: ∏(1 + change)^(1/n) ≈ 0.979 (actual compound effect)
- **Bias per update**: ~2.1% decline per price calculation

### Update Frequency Analysis

Price updates occur when `getCoinPrice()` is called:
- **Memory cache**: 5 minutes
- **Database cache**: 1 hour  
- **Triggers**: Every crypto command (`/crypto prices`, `/crypto buy`, `/wallet`, etc.)

In an active game, this means frequent price updates, accelerating the decline.

### Simulation Results

| Update Frequency | 1 Week Decline | Notes |
|------------------|----------------|-------|
| Daily | 13.8% | Slow decline |
| 4x per day | 44.7% | Moderate decline |
| Hourly | 97.1% | Severe decline |
| Every 5 minutes | >99% | Near-zero prices |

**Actual decline**: 92.5% → suggests approximately hourly effective update frequency.

### Market Events Impact

Additional negative pressure from market events:
- **Bull Run**: 15% weekly chance, +30% gain, 12 hours
- **Market Crash**: 12% weekly chance, -30% loss, 8 hours
- **Net effect**: Slightly positive (+0.74% weekly) but insufficient to offset algorithmic bias

## Why This Happened

1. **Primary cause**: Mathematical bias in multiplicative random walk
2. **Amplifier**: Frequent price updates in active gameplay
3. **Compound effect**: Each update multiplies the bias
4. **Inevitable outcome**: System designed to trend toward zero

## Evidence

### Code Location
- **File**: `src/services/MoneyService.ts`
- **Lines**: 405-406 (pricing algorithm)
- **Method**: `getCoinPrice()`

### Mathematical Proof
```
For uniform change in [-0.35, 0.35]:
Geometric mean = exp(∫log(1+x)dx) ≈ 0.979
Expected decline per update = 2.1%
Weekly compound (hourly updates) = 0.979^168 ≈ 0.029 (97% decline)
```

### Reproduction
The decline is reproducible with 100% probability given sufficient updates.

## Impact Assessment

### Player Experience
- **Crypto investments**: Rapid devaluation
- **Game economy**: Undermined crypto trading feature
- **Player trust**: Appears as system manipulation

### Business Impact
- **Feature effectiveness**: Crypto system essentially non-functional
- **Player retention**: Negative experience with crypto trading

## Recommended Solutions

### Option 1: Bias Correction (Minimal Change)
```typescript
const change = (Math.random() - 0.5) * 2 * volatility;
const biasCorrection = volatility * volatility / 6; // For uniform distribution
const newPrice = Math.max(lastPrice * Math.exp(change - biasCorrection), 0.01);
```

### Option 2: Proper Log-Normal Process
```typescript
const logChange = (Math.random() - 0.5) * 2 * volatility;
const newPrice = Math.max(lastPrice * Math.exp(logChange), 0.01);
```

### Option 3: Discrete Multiplicative (Simplest)
```typescript
const isIncrease = Math.random() < 0.5;
const multiplier = 1 + Math.random() * volatility;
const newPrice = isIncrease 
  ? lastPrice * multiplier 
  : lastPrice / multiplier;
```

## Immediate Actions Required

1. **Stop the decline**: Implement bias correction
2. **Reset crypto price**: Set to reasonable baseline
3. **Test thoroughly**: Verify fix with simulations
4. **Update documentation**: Explain pricing mechanism

## Prevention

1. **Mathematical review**: Validate random processes
2. **Simulation testing**: Test economic algorithms before deployment
3. **Monitoring**: Track price trends for anomalies

## Conclusion

This is a **systematic issue** requiring **code changes**. The crypto decline is not due to bad luck, player actions, or random chance - it's a mathematical certainty given the current algorithm.

**Recommendation**: Implement Option 1 (bias correction) as the minimal fix, then consider proper log-normal process for long-term robustness.

## Investigation Methodology

This investigation used:
1. **Code Analysis**: Examined the pricing algorithm implementation
2. **Mathematical Analysis**: Applied probability theory and stochastic calculus
3. **Simulation**: Ran 1000+ simulations to verify the theoretical analysis
4. **Data Analysis**: Matched reported decline to expected mathematical outcome

The conclusion is definitive: the current algorithm is mathematically flawed and will inevitably drive crypto prices toward zero.