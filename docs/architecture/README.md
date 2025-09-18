# Architecture Documentation

This directory contains documentation about the MafiaWar Discord bot architecture.

## Documents

### [Static Data Migration Analysis](./static-data-migration.md)
Comprehensive analysis of the static data architecture, showing that the bot already implements optimal performance patterns by storing static game data in TypeScript files rather than querying the database.

**Key Findings:**
- ✅ Static data is already optimized (stored in `src/data/` TypeScript files)
- ✅ Services use direct imports for ~500-1000x faster access
- ✅ Database used only for dynamic player data
- ✅ Type-safe development with full IDE support

## Architecture Overview

### Data Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MAFIA WAR BOT ARCHITECTURE               │
├─────────────────────────────────────────────────────────────┤
│  STATIC DATA (TypeScript Files)     │  DYNAMIC DATA (DB)    │
│  ⚡ Instant Access                   │  🔄 Network Queries   │
├─────────────────────────────────────┼──────────────────────│
│  📁 src/data/crimes.ts              │  👤 User profiles     │
│  📁 src/data/assets.ts              │  💰 Character stats   │
│  📁 src/data/items.ts               │  🏢 Player assets     │
│  📁 src/data/money.ts               │  📊 Action logs       │
│                                     │  🔒 Transactions      │
├─────────────────────────────────────┼──────────────────────│
│  📚 SERVICE LAYER                   │  🔍 DATABASE QUERIES  │
│  ├─ CrimeService                    │  ├─ User management   │
│  ├─ AssetService                    │  ├─ Money tracking    │
│  ├─ Commands                        │  ├─ Gang operations   │
│  └─ Utilities                       │  └─ Audit trails     │
└─────────────────────────────────────┴──────────────────────┘
```

### Performance Benefits

| Operation | Static Data | Database Query |
|-----------|-------------|----------------|
| Crime lookup | ~0.1ms | ~50-100ms |
| Asset template | ~0.1ms | ~50-100ms |
| Item definition | ~0.1ms | ~50-100ms |

### Development Workflow

1. **Static Data Updates**: Modify TypeScript files in `src/data/`
2. **Validation**: Run `yarn validate:static-data`
3. **Restart**: Changes take effect on bot restart
4. **Optional**: Run seeder to sync database backup

## Tools and Utilities

### Static Data Validator
- **Command**: `yarn validate:static-data`
- **Purpose**: Validates integrity of all static data
- **Checks**: Unique IDs, required fields, business logic, cross-references
- **File**: `src/utils/StaticDataValidator.ts`

### Cache Manager
- **Purpose**: In-memory caching for dynamic data
- **Usage**: Frequently accessed database queries
- **File**: `src/utils/CacheManager.ts`

### Database Manager
- **Purpose**: Singleton for database connections
- **Usage**: All dynamic data operations
- **File**: `src/utils/DatabaseManager.ts`