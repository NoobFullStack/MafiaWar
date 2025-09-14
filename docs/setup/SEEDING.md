# 🌱 MafiaWar Seeding System

Complete guide for managing game data in MafiaWar Discord bot.

## 📋 Quick Commands

```bash
# Full seeding (recommended for new setups)
yarn seed

# Specific data types
yarn seed --items      # Seed only items
yarn seed --crimes     # Seed only crimes
yarn seed --assets     # Seed only assets

# Safe operations
yarn seed --new        # Only add new items (no updates)
yarn seed --validate   # Check data integrity
yarn seed --stats      # Show seeding statistics
```

## 🎯 System Overview

The MafiaWar seeding system is designed to be:

- **✅ Extensible**: Easy to add new items, crimes, and assets
- **✅ Safe**: Upserts prevent duplicates and data loss  
- **✅ Flexible**: Supports both initial seeding and incremental updates
- **✅ Maintainable**: Changes to existing data won't invalidate your database

## 📁 Data Files Structure

```
src/data/
├── items.ts       # Game items (tools, consumables, etc.)
├── crimes.ts      # Crime activities and rewards
└── assets.ts      # Properties and investments
```

## 🔧 How It Works

### Upsert Strategy
The seeder uses **upserts** (update or insert) to safely manage data:

1. **If item exists**: Updates with new data
2. **If item doesn't exist**: Creates new record
3. **No data loss**: Existing records are preserved

### Example: Adding New Items

1. **Add to data file**:
```typescript
// src/data/items.ts
{
  id: "new_tool",
  name: "New Tool",
  type: "tool",
  value: 100,
  description: "A new tool for crimes.",
  rarity: "common",
}
```

2. **Run seeding**:
```bash
yarn seed --items
```

3. **Result**: New item available in game immediately!

## 📊 Data Validation

### Automatic Checks
- **Duplicate IDs**: Prevents conflicts
- **Required fields**: Ensures data completeness
- **Value ranges**: Validates pricing makes sense
- **Reference integrity**: Checks item relationships

### Manual Validation
```bash
# Check data integrity
yarn seed --validate

# View seeding statistics
yarn seed --stats
```

## 🚀 Best Practices

### 1. **Use Incremental Updates**
```bash
# Safe: Only adds new items
yarn seed --new

# Careful: Updates existing items
yarn seed --items
```

### 2. **Test Changes First**
```bash
# Validate before seeding
yarn seed --validate

# Check what will be seeded
yarn seed --stats
```

### 3. **Backup Important Data**
```bash
# Export current data (if needed)
yarn export-data
```

## 🎮 Item Configuration

### Item Types
- `tool`: Provides crime bonuses
- `consumable`: Temporary effects
- `trade_good`: For trading/selling
- `collectible`: Rare items for prestige

### Crime Bonuses
```typescript
metadata: {
  crimeBonus: {
    pickpocket: 0.05,     // +5% success rate
    burglary: 0.10,       // +10% success rate
  }
}
```

### Rarity Levels
- `common`: Basic items
- `uncommon`: Better items
- `rare`: Valuable items
- `epic`: Very rare items
- `legendary`: Extremely rare items

## 🏗️ Crime Configuration

### Crime Properties
```typescript
{
  id: "crime_id",
  name: "Crime Name",
  difficulty: 5,          // 1-10 scale
  cooldown: 3600,         // seconds
  rewardMin: 1000,        // minimum reward
  rewardMax: 3000,        // maximum reward
  baseSuccessRate: 0.60,  // 60% base success
  category: "robbery"     // crime category
}
```

### Categories
- `petty`: Low-level crimes
- `theft`: Stealing items
- `robbery`: Armed crimes
- `violence`: Violent crimes
- `white_collar`: Financial crimes
- `organized`: High-level crimes

## 💰 Economic Balance

Items and crimes are balanced using our **Gameplay Economy System**:

```bash
# Analyze economy balance
yarn economy:analyze

# Validate item pricing
yarn economy:validate
```

See [Economics System README](./ECONOMICS.md) for details.

## 🚨 Troubleshooting

### Common Issues

**"Duplicate ID" Error**:
```bash
# Check for duplicate IDs
yarn seed --validate
```

**"Database connection failed"**:
```bash
# Ensure database is running
yarn dev  # Starts the bot (which connects to DB)
```

**"Prisma schema outdated"**:
```bash
# Regenerate Prisma client
yarn prisma generate
```

### Reset Database (Development Only)
```bash
# ⚠️  WARNING: This deletes all data!
yarn prisma migrate reset
yarn seed  # Re-seed after reset
```

## 📝 Adding New Content

### 1. New Item
1. Add to `src/data/items.ts`
2. Run `yarn seed --items`
3. Test with `yarn economy:validate`

### 2. New Crime
1. Add to `src/data/crimes.ts`  
2. Run `yarn seed --crimes`
3. Test with `yarn economy:analyze`

### 3. New Asset
1. Add to `src/data/assets.ts`
2. Run `yarn seed --assets`
3. Test with bot commands

## 🔗 Related Documentation

- [Economics System](./ECONOMICS.md) - Economy balance and analysis
- [Game Design](./development/game-design.md) - Overall game mechanics
- [Installation Guide](./setup/INSTALLATION.md) - Setting up the project
