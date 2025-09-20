# Scripts Directory Organization

This directory contains various utility scripts for the MafiaWar Discord bot, organized by purpose for better maintainability.

## 📁 Directory Structure

### 🧪 `/testing/`
Unit tests and integration tests for game systems:
- `testJail.ts` - Basic jail system functionality tests
- `testBribePayment.ts` - Bribe payment system with multi-source funding
- `testBribeConsistency.ts` - Ensures bribe amounts remain consistent
- `assetValidation.ts` - Asset system integration tests

### 🗄️ `/database/`
Database operations, migrations, and maintenance:
- `seed.ts` - Initialize game data (items, crimes, assets)
- `migrateMoney.ts` - Legacy money system migration script
- `cleanupDuplicateAssets.ts` - Remove duplicate assets from race conditions

### 🎮 `/demos/`
Demonstration scripts showing system functionality:
- `crimeSystemDemo.ts` - Crime execution system demonstration
- `levelGatingDemo.ts` - Level gating system examples

### 🔧 `/development/`
Development tools and utilities:
- `validateEnvironment.ts` - Environment configuration validator
- `economy.ts` - Economic analysis and rebalancing tool

## 🚀 Usage

### Quick Test Commands

```bash
# Environment validation (always run first)
npm run env:validate

# Jail system tests
npm run test:jail                 # Basic jail functionality
npm run test:bribe               # Bribe payment system
npm run test:bribe-consistency   # Bribe amount consistency

# Asset system validation
npm run assets:validate

# Database operations
npm run seed                     # Initialize game data
npm run cleanup:duplicates       # Remove duplicate assets

# Economic tools
npm run economy:analyze          # Economic analysis
npm run economy:rebalance        # Rebalance item pricing

# System demonstrations
npm run crime:demo               # Crime system demo
npm run level:demo               # Level gating demo
```

### Environment Setup

All scripts require proper environment configuration. Use the validation script first:

```bash
npx ts-node src/scripts/development/validateEnvironment.ts
```

Make sure your `.env` file includes `DEBUG_DISCORD_ID` for testing scripts:

```env
DEBUG_DISCORD_ID=your_discord_id_here
```

## 📋 Prerequisites

- Environment variables configured (see `.env.example`)
- Discord user account with character created for testing
- Database connection established

## 🔒 Security

- Never commit Discord IDs or tokens to version control
- All test scripts use `DEBUG_DISCORD_ID` environment variable
- Sensitive configuration is gitignored in `.env`

## 📝 Adding New Scripts

When adding new scripts, place them in the appropriate category:

- **Testing**: Scripts that test game functionality
- **Database**: Scripts that modify or maintain database state
- **Demos**: Scripts that demonstrate system features
- **Development**: Tools for developers and debugging

Update this README when adding new scripts or categories.