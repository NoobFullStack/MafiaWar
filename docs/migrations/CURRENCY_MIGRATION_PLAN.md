# Currency Migration Plan: Character-Based to Dedicated Tables

## Overview
This document outlines the migration from storing currency data as columns in the Character table to dedicated, normalized currency tables.

## Current State
```sql
-- Character table (current)
model Character {
  cashOnHand      Int      @default(0)     // Vulnerable to theft
  bankBalance     Int      @default(0)     // Vulnerable to government  
  cryptoWallet    Json     @default("{}")  // {"bitcoin": 1.5, "ethereum": 0.8}
  bankAccessLevel Int      @default(1)     // Unlocks higher limits
  lastBankVisit   DateTime?
  // ... other fields
}
```

## Target State
```sql
-- New dedicated currency tables
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
```

## Migration Strategy

### Phase 1: Schema Addition (Safe)
1. Add new `CurrencyBalance` and `BankingProfile` tables
2. Keep existing Character columns temporarily for backwards compatibility
3. Deploy schema changes

### Phase 2: Data Migration (Zero Downtime)
1. Create migration script that populates new tables from existing Character data
2. Validate data integrity
3. Keep both systems in sync during transition

### Phase 3: Service Updates (Surgical)
1. Update MoneyService to read/write from new tables
2. Add fallback logic to read from Character table if new tables are empty
3. Maintain transaction logging in existing tables

### Phase 4: Code Migration (Iterative)
1. Update all currency operations across codebase
2. Remove fallback logic
3. Test thoroughly

### Phase 5: Cleanup (Final)
1. Remove deprecated columns from Character table
2. Update documentation
3. Verify all functionality

## Data Integrity Guarantees
- All migrations will be wrapped in database transactions
- Rollback capability at each phase
- Validation checks before each step
- Audit trail preservation
- Zero data loss commitment

## Backwards Compatibility
- Existing APIs will continue to work during migration
- Gradual cutover approach
- Rollback procedures documented

## Testing Strategy
- Unit tests for new CurrencyBalance operations
- Integration tests for MoneyService
- End-to-end tests for all currency commands
- Data integrity validation scripts
- Performance benchmarking