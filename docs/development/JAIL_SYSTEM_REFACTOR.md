# Jail System Refactor - Implementation Guide

## Overview

The jail system has been refactored to use a dedicated `Jail` table instead of storing jail data directly in the `Character` table. This improvement provides better data organization, enhanced features, and improved scalability.

## Key Improvements

### 1. **Dedicated Jail Table**

- Separated jail data from character table for better organization
- Enables tracking of complete jail history for each player
- Supports multiple jail records per character

### 2. **Enhanced Features**

- **Release Cooldown**: 15-minute cooldown after release prevents immediate re-jailing
- **Auto-Release**: Expired jail sentences are automatically processed
- **Detailed Statistics**: Track total sentences, bribes used, last jailed time
- **Better History**: Complete audit trail of all jail activities

### 3. **Backward Compatibility**

- Old jail fields in Character table marked as deprecated but preserved
- Migration script handles existing data safely
- No data loss during transition

## Database Schema Changes

### New Jail Table

```sql
model Jail {
  id                   String    @id @default(uuid())
  characterId          String
  jailUntil            DateTime? // When the player gets out of jail (null = released)
  jailCrime            String    // What crime landed them in jail
  jailSeverity         Int       // Severity of the crime (1-10, affects bribe cost)
  jailBribeAmount      Int       // Fixed bribe amount set when jailed
  jailTimeMinutes      Int       // Original jail time sentence in minutes
  isActive             Boolean   @default(true) // Whether this is the current active jail sentence
  jailedAt             DateTime  @default(now()) // When the player was jailed
  releasedAt           DateTime? // When the player was released (null = still in jail)
  releaseReason        String?   // "time_served", "bribed_out", "admin_release"
  releaseCooldownUntil DateTime? // When the player can be jailed again (15 min cooldown)
  character            Character @relation(fields: [characterId], references: [id], onDelete: Cascade)
}
```

### Character Table Changes

```sql
model Character {
  // Jail system - moved to separate Jail table, keeping these for migration compatibility
  jailUntil       DateTime? // DEPRECATED: Will be removed after migration
  jailCrime       String?   // DEPRECATED: Will be removed after migration
  jailSeverity    Int       @default(0) // DEPRECATED: Will be removed after migration
  jailBribeAmount Int?      // DEPRECATED: Will be removed after migration
  totalJailTime   Int       @default(0) // Total minutes spent in jail (for stats) - will be kept

  jailRecords     Jail[]    // Jail records for this character
}
```

## Service Improvements

### New Methods Added

- `checkReleaseCooldown(userId)` - Check if player is on release cooldown
- `canPlayerBeJailed(userId)` - Check if player can be jailed (not in jail, not on cooldown)
- `autoReleaseExpiredJail(jailRecordId)` - Auto-release expired sentences

### Enhanced Methods

- `isPlayerInJail()` - Now includes auto-release logic and jail record reference
- `sendToJail()` - Added cooldown and duplicate jail checks
- `releaseFromJail()` - Now sets release cooldown and updates jail records
- `getJailStats()` - Enhanced with detailed statistics from jail history

### New Interfaces

```typescript
interface CooldownStatus {
  onCooldown: boolean;
  timeLeft?: number;
  timeLeftFormatted?: string;
  canBeJailed: boolean;
}
```

## Migration Process

### 1. Database Migration

```bash
# Run Prisma migration to create Jail table
npx prisma migrate dev --name add-jail-table
```

### 2. Data Migration

```bash
# Run the data migration script
npx tsx scripts/database/migrateJailToTable.ts
```

### 3. Testing

```bash
# Run the jail system test
npx tsx scripts/testing/testJailSystem.ts
```

## New Features

### 1. Release Cooldown System

- Players cannot be jailed again for 15 minutes after release
- Applies to both time-served and bribed releases
- Prevents rapid re-jailing abuse

### 2. Enhanced Statistics

- Total jail sentences count
- Total bribes used count
- Last jailed timestamp with Discord relative time
- Active release cooldown status

### 3. Auto-Release

- Expired jail sentences are automatically processed
- Sets appropriate release reason and cooldown
- Happens when jail status is checked

### 4. Better Audit Trail

- Complete history of all jail sentences
- Release reasons tracked ("time_served", "bribed_out", "admin_release")
- Timestamps for jailed and released times

## Updated Commands

### `/jail stats` Command

Now shows enhanced statistics:

```
📊 Jail Statistics
Total Time Served: 2h 30m
Currently in Jail: No
Total Sentences: 3
Bribes Used: 1
Last Jailed: 2 hours ago
Release Cooldown: 12m

💡 Tip: Keep some crypto hidden - police can't see it for bribes!
```

## Implementation Details

### Cooldown Logic

- 15-minute cooldown starts when released (any reason)
- Stored in `releaseCooldownUntil` field
- Checked before allowing new jail sentences

### Active Sentence Logic

- Only one active jail sentence per character (`isActive: true`)
- Previous sentences marked inactive when new ones created
- Auto-release marks sentences inactive with release timestamp

### Backward Compatibility

- Old character jail fields preserved during migration
- Migration script creates jail records from existing data
- Gradual removal of deprecated fields in future updates

## Error Handling

### Common Scenarios

- **Already in jail**: Prevents duplicate active sentences
- **On release cooldown**: Blocks new sentences during cooldown
- **No active sentence**: Handles release attempts gracefully
- **Expired sentences**: Auto-processed on status checks

### Logging

- All jail operations logged for debugging
- Migration progress tracked with detailed output
- Error scenarios logged with context

## Testing

### Automated Tests

The `testJailSystem.ts` script covers:

1. Initial status check
2. Ability to jail check
3. Jailing process
4. Duplicate jail prevention
5. Statistics retrieval
6. Release process
7. Post-release status
8. Cooldown functionality
9. Cooldown jail prevention

### Manual Testing

1. Use `/jail status` to check current status
2. Use crime commands to get jailed
3. Use `/jail bribe` to test bribe system
4. Use `/jail stats` to view enhanced statistics
5. Try multiple operations to test cooldowns

## Performance Considerations

### Database Queries

- Indexes added for `[characterId, isActive]` and `[releaseCooldownUntil]`
- Efficient queries for active sentences
- Aggregation queries for statistics

### Memory Usage

- Minimal additional memory footprint
- Efficient data structures for status checks
- Cleanup of expired records handled automatically

## Future Enhancements

### Planned Features

1. **Jail History UI**: Discord embed showing complete jail history
2. **Advanced Analytics**: Server-wide jail statistics
3. **Jail Events**: Notifications for important jail events
4. **Custom Cooldowns**: Configurable cooldown times based on crime severity

### Cleanup Tasks

1. Remove deprecated Character table jail fields after verification
2. Add more comprehensive jail history queries
3. Implement jail record cleanup for very old records

## Troubleshooting

### Common Issues

1. **Migration fails**: Check database permissions and connectivity
2. **Tests fail**: Ensure database is properly migrated
3. **Statistics wrong**: Run migration script again if needed
4. **Cooldown not working**: Check system time and database timestamps

### Debugging

- Check logs for detailed error information
- Use test script to verify functionality
- Review database records directly if needed
- Validate Prisma client generation

## Conclusion

This jail system refactor provides a solid foundation for enhanced gameplay mechanics while maintaining backward compatibility and data integrity. The new features improve both player experience and administrative capabilities.
