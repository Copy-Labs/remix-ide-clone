/**
 * GitCacheService provides a caching layer for Git operations to improve performance.
 * It caches the results of expensive Git operations to avoid redundant calls.
 */

import { debug, info } from '@/services/loggerService';
import { gitEventEmitter, GitEventType } from '@/services/gitEventEmitter';

// Define cache entry interface with expiration
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Define cache configuration
interface CacheConfig {
  defaultTTL: number; // Default time-to-live in milliseconds
  maxEntries: number; // Maximum number of entries in the cache
}

/**
 * GitCacheService class for caching Git operation results
 */
export class GitCacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private config: CacheConfig;
  private static instance: GitCacheService;

  // Private constructor to enforce singleton pattern
  private constructor(config?: Partial<CacheConfig>) {
    this.config = {
      defaultTTL: 60000, // 1 minute by default
      maxEntries: 100, // 100 entries by default
      ...config,
    };

    // Listen for events that should invalidate the cache
    this.setupEventListeners();
  }

  /**
   * Get the singleton instance of GitCacheService
   */
  public static getInstance(config?: Partial<CacheConfig>): GitCacheService {
    if (!GitCacheService.instance) {
      GitCacheService.instance = new GitCacheService(config);
    }
    return GitCacheService.instance;
  }

  /**
   * Set up event listeners to invalidate cache when Git state changes
   */
  private setupEventListeners(): void {
    // Invalidate branch-related cache entries when branches change
    gitEventEmitter.on(GitEventType.BRANCH_CREATED, () => {
      this.invalidateByPrefix('branches');
      this.invalidateByPrefix('currentBranch');
    });

    gitEventEmitter.on(GitEventType.BRANCH_SWITCHED, () => {
      this.invalidateByPrefix('branches');
      this.invalidateByPrefix('currentBranch');
      this.invalidateByPrefix('status');
    });

    // Invalidate commit-related cache entries when commits change
    gitEventEmitter.on(GitEventType.COMMIT_CREATED, () => {
      this.invalidateByPrefix('commits');
      this.invalidateByPrefix('log');
      this.invalidateByPrefix('status');
    });

    // Invalidate status-related cache entries when status changes
    gitEventEmitter.on(GitEventType.FILE_STAGED, () => {
      this.invalidateByPrefix('status');
    });

    gitEventEmitter.on(GitEventType.FILE_UNSTAGED, () => {
      this.invalidateByPrefix('status');
    });

    // Invalidate all cache entries when repository is initialized
    gitEventEmitter.on(GitEventType.REPOSITORY_INITIALIZED, () => {
      this.clear();
    });
  }

  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns The cached value or undefined if not found or expired
   */
  public get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if the entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    debug(`Cache hit for key: ${key}`);
    return entry.data as T;
  }

  /**
   * Set a value in the cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time-to-live in milliseconds (optional, uses default if not provided)
   */
  public set<T>(key: string, value: T, ttl?: number): void {
    // Enforce maximum cache size
    if (this.cache.size >= this.config.maxEntries && !this.cache.has(key)) {
      // Remove the oldest entry
      const oldestKey = this.getOldestKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const timestamp = Date.now();
    const expiresAt = timestamp + (ttl || this.config.defaultTTL);

    this.cache.set(key, {
      data: value,
      timestamp,
      expiresAt,
    });

    debug(`Cache set for key: ${key}`);
  }

  /**
   * Delete a value from the cache
   * @param key Cache key
   */
  public delete(key: string): void {
    this.cache.delete(key);
    debug(`Cache deleted for key: ${key}`);
  }

  /**
   * Clear all values from the cache
   */
  public clear(): void {
    this.cache.clear();
    info('Cache cleared');
  }

  /**
   * Invalidate all cache entries with keys starting with the given prefix
   * @param prefix Key prefix
   */
  public invalidateByPrefix(prefix: string): void {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    if (keysToDelete.length > 0) {
      debug(`Invalidated ${keysToDelete.length} cache entries with prefix: ${prefix}`);
    }
  }

  /**
   * Get the key of the oldest cache entry
   * @returns The oldest key or undefined if the cache is empty
   */
  private getOldestKey(): string | undefined {
    let oldestKey: string | undefined;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * Get the number of entries in the cache
   * @returns The number of entries
   */
  public size(): number {
    return this.cache.size;
  }

  /**
   * Get all keys in the cache
   * @returns Array of keys
   */
  public keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Check if a key exists in the cache and is not expired
   * @param key Cache key
   * @returns True if the key exists and is not expired
   */
  public has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if the entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Wrap a function with caching
   * @param key Cache key
   * @param fn Function to wrap
   * @param ttl Time-to-live in milliseconds (optional)
   * @returns The result of the function, either from cache or by executing the function
   */
  public async getOrCompute<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    const cachedValue = this.get<T>(key);

    if (cachedValue !== undefined) {
      return cachedValue;
    }

    debug(`Cache miss for key: ${key}`);
    const value = await fn();
    this.set(key, value, ttl);
    return value;
  }
}

// Export a singleton instance
export const gitCacheService = GitCacheService.getInstance();
