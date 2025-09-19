import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/ResponseUtil";

export interface WriteOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'upsert';
  model: string;
  data: any;
  where?: any;
  priority: number; // Higher number = higher priority
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  userId?: string; // For user-specific operations
}

export interface WriteQueueConfig {
  batchSize: number;
  processingInterval: number; // milliseconds
  maxRetries: number;
  retryDelay: number; // milliseconds
}

export class WriteQueueService {
  private static instance: WriteQueueService;
  private queue: WriteOperation[] = [];
  private processing = false;
  private prisma: PrismaClient;
  private config: WriteQueueConfig;
  private processingTimer?: NodeJS.Timeout;

  private constructor(prisma: PrismaClient, config?: Partial<WriteQueueConfig>) {
    this.prisma = prisma;
    this.config = {
      batchSize: 10,
      processingInterval: 1000, // 1 second
      maxRetries: 3,
      retryDelay: 2000, // 2 seconds
      ...config
    };
  }

  public static getInstance(prisma?: PrismaClient, config?: Partial<WriteQueueConfig>): WriteQueueService {
    if (!WriteQueueService.instance) {
      if (!prisma) {
        throw new Error("Prisma client required for first initialization");
      }
      WriteQueueService.instance = new WriteQueueService(prisma, config);
    }
    return WriteQueueService.instance;
  }

  /**
   * Start the queue processing loop
   */
  public start(): void {
    if (this.processingTimer) {
      return; // Already started
    }

    logger.info("🚀 Write Queue Service started");
    this.processingTimer = setInterval(() => {
      this.processQueue();
    }, this.config.processingInterval);
  }

  /**
   * Stop the queue processing loop
   */
  public stop(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = undefined;
      logger.info("⏹️ Write Queue Service stopped");
    }
  }

  /**
   * Add a write operation to the queue
   */
  public enqueue(operation: Omit<WriteOperation, 'id' | 'retryCount' | 'createdAt'>): string {
    const id = this.generateId();
    const writeOp: WriteOperation = {
      ...operation,
      id,
      retryCount: 0,
      createdAt: new Date(),
      maxRetries: operation.maxRetries || this.config.maxRetries
    };

    // Insert in priority order (higher priority first)
    const insertIndex = this.queue.findIndex(op => op.priority < writeOp.priority);
    if (insertIndex === -1) {
      this.queue.push(writeOp);
    } else {
      this.queue.splice(insertIndex, 0, writeOp);
    }

    logger.debug(`📝 Enqueued ${operation.type} operation for ${operation.model} (ID: ${id})`);
    return id;
  }

  /**
   * Get queue status
   */
  public getStatus(): { queueLength: number; processing: boolean; config: WriteQueueConfig } {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      config: this.config
    };
  }

  /**
   * Process queued operations in batches
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    const batch = this.queue.splice(0, this.config.batchSize);

    try {
      await this.processBatch(batch);
    } catch (error) {
      logger.error("❌ Error processing write queue batch:", error);
      // Re-queue failed operations
      batch.forEach(op => {
        if (op.retryCount < op.maxRetries) {
          op.retryCount++;
          this.queue.unshift(op); // Add back to front for retry
        } else {
          logger.error(`💀 Operation ${op.id} failed after ${op.maxRetries} retries`);
        }
      });
    } finally {
      this.processing = false;
    }
  }

  /**
   * Process a batch of operations within a transaction
   */
  private async processBatch(operations: WriteOperation[]): Promise<void> {
    if (operations.length === 0) return;

    logger.debug(`⚡ Processing batch of ${operations.length} operations`);

    // Use a transaction for atomic batch processing
    await this.prisma.$transaction(async (tx: any) => {
      for (const operation of operations) {
        try {
          await this.executeOperation(tx, operation);
          logger.debug(`✅ Completed operation ${operation.id}`);
        } catch (error) {
          logger.error(`❌ Operation ${operation.id} failed:`, error);
          throw error; // Will rollback the entire transaction
        }
      }
    });

    logger.debug(`🎉 Successfully processed batch of ${operations.length} operations`);
  }

  /**
   * Execute a single operation
   */
  private async executeOperation(tx: any, operation: WriteOperation): Promise<any> {
    const model = (tx as any)[operation.model];
    if (!model) {
      throw new Error(`Model ${operation.model} not found`);
    }

    switch (operation.type) {
      case 'create':
        return await model.create({ data: operation.data });

      case 'update':
        return await model.update({
          where: operation.where,
          data: operation.data
        });

      case 'delete':
        return await model.delete({ where: operation.where });

      case 'upsert':
        return await model.upsert({
          where: operation.where,
          create: operation.data.create || operation.data,
          update: operation.data.update || operation.data
        });

      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  /**
   * Generate unique ID for operations
   */
  private generateId(): string {
    return `wq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Convenience methods for common operations
   */

  public createUser(data: any, priority: number = 5): string {
    return this.enqueue({
      type: 'create',
      model: 'user',
      data,
      priority,
      maxRetries: this.config.maxRetries
    });
  }

  public updateCharacter(where: any, data: any, priority: number = 5): string {
    return this.enqueue({
      type: 'update',
      model: 'character',
      where,
      data,
      priority,
      maxRetries: this.config.maxRetries,
      userId: where.userId
    });
  }

  public createActionLog(data: any, priority: number = 3): string {
    return this.enqueue({
      type: 'create',
      model: 'actionLog',
      data,
      priority,
      maxRetries: this.config.maxRetries,
      userId: data.userId
    });
  }

  public updateAsset(where: any, data: any, priority: number = 4): string {
    return this.enqueue({
      type: 'update',
      model: 'asset',
      where,
      data,
      priority,
      maxRetries: this.config.maxRetries
    });
  }

  public createBankTransaction(data: any, priority: number = 6): string {
    return this.enqueue({
      type: 'create',
      model: 'bankTransaction',
      data,
      priority,
      maxRetries: this.config.maxRetries,
      userId: data.userId
    });
  }

  public createCryptoTransaction(data: any, priority: number = 6): string {
    return this.enqueue({
      type: 'create',
      model: 'cryptoTransaction',
      data,
      priority,
      maxRetries: this.config.maxRetries,
      userId: data.userId
    });
  }

  /**
   * High priority operations for critical game state changes
   */
  public updateCharacterMoney(where: any, data: any): string {
    return this.enqueue({
      type: 'update',
      model: 'character',
      where,
      data,
      priority: 10, // High priority for money operations
      maxRetries: 5, // Extra retries for critical operations
      userId: where.userId
    });
  }

  /**
   * Wait for all current operations to complete (useful for testing)
   */
  public async flush(): Promise<void> {
    while (this.queue.length > 0 || this.processing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}