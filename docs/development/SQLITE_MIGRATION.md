# SQLite3 Migration and Write Queue System

This document describes the migration from PostgreSQL/Supabase to SQLite3 and the implementation of a custom write queue system for MafiaWar.

## Overview

The migration provides several benefits:
- **Simplified Deployment**: No external database dependencies
- **Improved Performance**: Local SQLite access with write queue optimization
- **Reduced Complexity**: Eliminates Supabase configuration and networking concerns
- **Better Reliability**: Queue system with retries and error handling

## Database Migration

### Schema Changes

The Prisma schema has been updated to use SQLite3:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

### Key Changes from PostgreSQL:
- Removed `directUrl` configuration (not needed for SQLite)
- All existing models remain compatible with SQLite
- UUID support maintained through Prisma's cuid() default
- JSON fields fully supported

### Database Location

SQLite database files are stored in the `data/` directory:
- Production: `data/mafiawar.db`
- Development: `data/dev.db`
- Testing: `data/test.db`

## Write Queue System

### Architecture

The WriteQueueService implements an asynchronous write queue with the following features:

#### Core Components
1. **Queue Management**: Priority-based operation ordering
2. **Batch Processing**: Configurable batch sizes for optimal performance
3. **Retry Logic**: Automatic retry with exponential backoff
4. **Transaction Safety**: Atomic batch processing
5. **Error Handling**: Comprehensive error logging and recovery

#### Configuration

Environment variables control queue behavior:

```env
WRITE_QUEUE_BATCH_SIZE=10        # Operations per batch
WRITE_QUEUE_INTERVAL=1000        # Processing interval (ms)
WRITE_QUEUE_MAX_RETRIES=3        # Maximum retry attempts
```

### Operation Types

The queue supports all standard database operations:

```typescript
interface WriteOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'upsert';
  model: string;
  data: any;
  where?: any;
  priority: number;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  userId?: string;
}
```

### Priority System

Operations are processed by priority (higher numbers first):
- **Priority 10**: Critical money operations
- **Priority 6**: Financial transactions (bank, crypto)
- **Priority 5**: Character updates
- **Priority 4**: Asset updates
- **Priority 3**: Action logging

### Usage Examples

#### Basic Usage

```typescript
import DatabaseManager from "../utils/DatabaseManager";

// Get write queue instance
const writeQueue = DatabaseManager.getWriteQueue();

// Enqueue character update
const operationId = writeQueue.updateCharacter(
  { userId: "user123" },
  { level: 5, experience: 1500 }
);
```

#### High-Priority Money Operations

```typescript
// Money operations get priority 10 automatically
const moneyOp = await DatabaseManager.updateCharacterMoney(
  "user123",
  1000,
  "add"
);
```

#### Action Logging

```typescript
// Action logs are queued with priority 3
const logOp = await DatabaseManager.logAction(
  "user123",
  "crime_committed",
  "success",
  { crimeType: "robbery", amount: 500 }
);
```

## Integration Guide

### Updating Existing Code

1. **Remove Supabase Dependencies**
   ```bash
   npm uninstall @supabase/supabase-js
   ```

2. **Update Environment Variables**
   ```env
   # Remove
   SUPABASE_URL=...
   SUPABASE_ANON_KEY=...
   DIRECT_URL=...
   
   # Add
   DATABASE_URL=file:./data/mafiawar.db
   WRITE_QUEUE_BATCH_SIZE=10
   WRITE_QUEUE_INTERVAL=1000
   WRITE_QUEUE_MAX_RETRIES=3
   ```

3. **Update Database Initialization**
   ```typescript
   // Initialize with write queue
   await DatabaseManager.connect();
   ```

### Converting Write Operations

#### Before (Direct Prisma)
```typescript
await prisma.character.update({
  where: { userId },
  data: { money: newAmount }
});
```

#### After (Write Queue)
```typescript
const operationId = DatabaseManager.getWriteQueue().updateCharacter(
  { userId },
  { money: newAmount },
  10 // High priority for money operations
);
```

## Scripts and Tools

### Database Setup

```bash
# Initialize SQLite database
npm run db:setup-sqlite

# Generate Prisma client
npm run db:generate

# Seed game data
npm run seed
```

### Testing

```bash
# Validate implementation
npm run test:validate

# Test SQLite and queue system
npm run test:sqlite-queue

# Run specific tests
npm run test:jail
npm run test:bribe
```

### Monitoring

```bash
# Check queue status in code
const status = writeQueue.getStatus();
console.log(status);
// Output: { queueLength: 5, processing: true, config: {...} }
```

## Performance Considerations

### Optimization Settings

1. **Batch Size**: Larger batches reduce transaction overhead but increase memory usage
2. **Processing Interval**: Lower intervals provide faster processing but higher CPU usage
3. **Retry Strategy**: Configurable retries balance reliability with performance

### Recommended Settings

- **Development**: Small batches (5-10), frequent processing (500ms)
- **Production**: Larger batches (20-50), moderate processing (1000ms)
- **High Load**: Very large batches (100+), optimized intervals (2000ms)

### SQLite Optimizations

SQLite performance is enhanced through:
- WAL mode for concurrent reads during writes
- Proper indexing on frequently queried columns
- Connection pooling through Prisma
- Atomic transactions for data consistency

## Error Handling

### Retry Logic

Failed operations are automatically retried with:
1. Exponential backoff delay
2. Configurable maximum attempts
3. Operation-specific retry limits
4. Comprehensive error logging

### Failure Scenarios

The system handles:
- Database connection issues
- Transaction conflicts
- Invalid operation data
- Queue overflow conditions
- Graceful shutdown scenarios

## Migration Checklist

- [x] Update Prisma schema to SQLite3
- [x] Remove Supabase dependencies
- [x] Implement WriteQueueService
- [x] Convert DatabaseManager to use queue
- [x] Update environment configuration
- [x] Create database setup scripts
- [x] Implement validation tests
- [x] Update documentation
- [x] Test migration process

## Benefits Achieved

1. **Simplified Architecture**: No external database service required
2. **Improved Performance**: Local database access with intelligent queuing
3. **Enhanced Reliability**: Retry logic and error recovery
4. **Better Scalability**: Queue system supports high write loads
5. **Easier Deployment**: Single executable with embedded database
6. **Cost Reduction**: No database hosting fees
7. **Development Efficiency**: Faster local development and testing

## Future Enhancements

1. **Persistent Queue**: File-backed queue for restart resilience
2. **Queue Monitoring**: Web dashboard for queue status
3. **Advanced Batching**: Smart batching based on operation types
4. **Distributed Queues**: Multiple worker processes
5. **Queue Analytics**: Performance metrics and optimization suggestions