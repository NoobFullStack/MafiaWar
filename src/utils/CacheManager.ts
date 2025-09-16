/**
 * Simple in-memory cache for frequently accessed static data
 * Helps reduce database load for data that changes infrequently
 */

import { logger } from "./ResponseUtil";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, CacheEntry<any>> = new Map();

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Set a cache entry with TTL
   */
  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    };
    
    this.cache.set(key, entry);
    
    if (process.env.NODE_ENV !== "production") {
      logger.info(`Cache SET: ${key} (TTL: ${ttlSeconds}s)`);
    }
  }

  /**
   * Get a cache entry if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;

    if (isExpired) {
      this.cache.delete(key);
      if (process.env.NODE_ENV !== "production") {
        logger.info(`Cache EXPIRED: ${key}`);
      }
      return null;
    }

    if (process.env.NODE_ENV !== "production") {
      const timeLeft = Math.round((entry.ttl - (now - entry.timestamp)) / 1000);
      logger.info(`Cache HIT: ${key} (${timeLeft}s remaining)`);
    }

    return entry.data;
  }

  /**
   * Get or fetch data with automatic caching
   */
  async getOrFetch<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch data
    try {
      const data = await fetchFunction();
      this.set(key, data, ttlSeconds);
      return data;
    } catch (error) {
      logger.error(`Cache fetch error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate a specific cache entry
   */
  invalidate(key: string): void {
    const deleted = this.cache.delete(key);
    if (deleted && process.env.NODE_ENV !== "production") {
      logger.info(`Cache INVALIDATED: ${key}`);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info(`Cache CLEARED: ${size} entries removed`);
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cache CLEANUP: ${cleanedCount} expired entries removed`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { 
    size: number; 
    entries: Array<{ key: string; age: number; ttl: number; expired: boolean }> 
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: Math.round((now - entry.timestamp) / 1000),
      ttl: Math.round(entry.ttl / 1000),
      expired: now - entry.timestamp > entry.ttl,
    }));

    return {
      size: this.cache.size,
      entries,
    };
  }
}

// Set up periodic cleanup
const cacheInstance = CacheManager.getInstance();
setInterval(() => {
  cacheInstance.cleanup();
}, 300000); // Clean up every 5 minutes

export default CacheManager;