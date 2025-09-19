# Jail System Refactor Documentation

## Overview
The jail system has been refactored to move jail data from the Character table to its own dedicated Jail table, and includes a release cooldown feature to prevent immediate re-jailing.

## Major Changes

### 1. Database Schema Changes
- **New Table**: `Jail` table created to store all jail-related data
- **Character Table**: Jail fields marked as deprecated but kept for migration compatibility
- **Indexes**: Added for efficient querying of active jails and cooldowns

### 2. New Features

#### Release Cooldown System
- Players cannot be jailed again for **15 minutes** after release
- Applies to both time-served releases and bribed releases
- Prevents exploit of immediate re-jailing after release

#### Enhanced Jail Tracking
- Complete history of all jail sentences
- Track release reasons (time_served, bribed_out, admin_release)
- Statistics include total sentences and total bribes used

### 3. API Changes

#### JailService Methods
All existing methods maintain backward compatibility:

- `isPlayerInJail()` - Now checks Jail table, auto-releases expired sentences
- `sendToJail()` - Checks cooldown status before jailing, throws error if on cooldown
- `releaseFromJail()` - Sets 15-minute release cooldown when releasing
- `getJailStats()` - Enhanced with new statistics

#### New Methods
- `checkReleaseCooldown()` - Check if player is on release cooldown
- `canPlayerBeJailed()` - Comprehensive check for jail eligibility
- `autoReleaseExpiredJail()` - Internal method to auto-release expired sentences

### 4. Migration Strategy

#### Database Migration
The migration script automatically:
1. Creates the new Jail table
2. Migrates existing jail data from Character table
3. Sets appropriate release status for expired sentences
4. Preserves all existing data

#### Backward Compatibility
- All existing API calls continue to work
- No breaking changes to commands or other services
- Character table jail fields kept temporarily for migration period

### 5. Error Handling

#### Cooldown Protection
When attempting to jail a player on cooldown:
- `JailService.sendToJail()` throws descriptive error
- CrimeService handles this gracefully (logs warning, doesn't break)
- Clear error messages for debugging

### 6. Testing

#### New Test Script
`testRefactoredJailSystem.ts` provides comprehensive testing:
- Tests new table structure
- Verifies cooldown functionality
- Checks statistics accuracy
- Validates error handling

#### Running Tests
```bash
npm run test:jail-refactored  # New comprehensive test
npm run test:jail             # Original test (still works)
```

## Database Schema

### Jail Table
```sql
CREATE TABLE "Jail" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "jailUntil" TIMESTAMP(3),
    "jailCrime" TEXT NOT NULL,
    "jailSeverity" INTEGER NOT NULL,
    "jailBribeAmount" INTEGER NOT NULL,
    "jailTimeMinutes" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "jailedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "releaseReason" TEXT,
    "releaseCooldownUntil" TIMESTAMP(3),
    CONSTRAINT "Jail_pkey" PRIMARY KEY ("id")
);
```

### Key Indexes
- `(characterId, isActive)` - Find active jail for character
- `(releaseCooldownUntil)` - Check cooldown expiry

## Cooldown Logic

### When Cooldown Applies
1. **Time Served Release**: 15-minute cooldown starts when sentence expires
2. **Bribe Release**: 15-minute cooldown starts when bribe is paid
3. **Admin Release**: 15-minute cooldown starts when manually released

### Cooldown Checks
- Before jailing: `checkReleaseCooldown()` verifies player can be jailed
- During crime failure: Graceful handling if jailing fails due to cooldown
- In jail commands: Display cooldown status in statistics

## Benefits

### 1. Better Data Organization
- Jail data properly normalized in dedicated table
- Complete audit trail of all jail sentences
- Easier to query and analyze jail patterns

### 2. Enhanced Gameplay
- Release cooldown prevents immediate re-jailing exploit
- More detailed statistics for players
- Better balance between crime risk and consequences

### 3. System Reliability
- Auto-release of expired sentences
- Graceful error handling for edge cases
- Comprehensive testing coverage

### 4. Future Extensibility
- Easy to add new jail-related features
- Historical data for analytics
- Support for more complex jail mechanics

## Migration Notes

### For Developers
1. All existing code continues to work unchanged
2. New cooldown checks happen automatically
3. Enhanced statistics available in jail commands
4. Test thoroughly with new test script

### For Database Administrators
1. Migration preserves all existing data
2. Character table jail fields can be removed in future
3. Indexes optimize performance for new queries
4. Migration handles edge cases (expired sentences, missing data)

### For Players
1. No visible changes to existing functionality
2. Enhanced jail statistics with more detail
3. Release cooldown prevents immediate re-jailing
4. Better feedback in jail commands and error messages