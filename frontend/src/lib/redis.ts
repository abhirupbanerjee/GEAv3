/**
 * Redis Caching Utility
 *
 * Provides connection management and caching helpers for Redis.
 * Used primarily for analytics caching to reduce database load.
 *
 * Usage:
 *   const data = await withCache('key', 300, fetchData, forceRefresh);
 *   await invalidateCache('analytics:*');
 */

import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;
let connectionPromise: Promise<RedisClientType> | null = null;

/**
 * Get Redis client (singleton with lazy connection)
 * Handles reconnection gracefully
 */
export async function getRedisClient(): Promise<RedisClientType> {
  // If already connecting, wait for that connection
  if (connectionPromise) {
    return connectionPromise;
  }

  // If connected and ready, return existing client
  if (redisClient?.isReady) {
    return redisClient;
  }

  // Create new connection
  connectionPromise = (async () => {
    try {
      const client = createClient({
        url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('Redis: Max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      client.on('error', (err) => {
        console.error('Redis client error:', err);
      });

      client.on('connect', () => {
        console.log('Redis: Connected');
      });

      client.on('reconnecting', () => {
        console.log('Redis: Reconnecting...');
      });

      await client.connect();
      redisClient = client as RedisClientType;
      return redisClient;
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
}

/**
 * Cache wrapper with TTL and force refresh support
 *
 * @param key Cache key
 * @param ttlSeconds Time-to-live in seconds
 * @param fetcher Async function to fetch data if cache miss
 * @param forceRefresh If true, bypass cache and fetch fresh data
 * @returns Cached or fresh data
 *
 * Example:
 *   const analytics = await withCache(
 *     'analytics:service-requests:entity:123',
 *     300,
 *     () => fetchAnalyticsFromDB(),
 *     searchParams.get('refresh') === 'true'
 *   );
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
  forceRefresh: boolean = false
): Promise<T> {
  try {
    const redis = await getRedisClient();

    // Check cache unless force refresh
    if (!forceRefresh) {
      const cached = await redis.get(key);
      if (cached && typeof cached === 'string') {
        return JSON.parse(cached) as T;
      }
    }

    // Fetch fresh data
    const data = await fetcher();

    // Store in cache (non-blocking)
    redis.setEx(key, ttlSeconds, JSON.stringify(data)).catch((err) => {
      console.warn('Redis: Failed to cache data:', err);
    });

    return data;
  } catch (error) {
    // If Redis fails, fall back to direct fetch
    console.warn('Redis: Cache unavailable, fetching directly:', error);
    return fetcher();
  }
}

/**
 * Build a cache key from prefix and parameters
 * Ensures consistent key ordering for cache hits
 *
 * @param prefix Key prefix (e.g., 'analytics:service-requests')
 * @param params Object of parameters to include in key
 * @returns Formatted cache key
 *
 * Example:
 *   buildCacheKey('analytics:service-requests', { entityId: '123', roleType: 'admin' })
 *   // Returns: 'analytics:service-requests:entityId:123:roleType:admin'
 */
export function buildCacheKey(prefix: string, params: Record<string, unknown>): string {
  const sorted = Object.keys(params)
    .sort((a, b) => a.localeCompare(b))
    .map((k) => `${k}:${params[k] ?? ''}`)
    .join(':');
  return `${prefix}:${sorted}`;
}

/**
 * Invalidate cache entries matching a pattern
 *
 * @param pattern Redis pattern (e.g., 'analytics:*')
 *
 * Example:
 *   await invalidateCache('analytics:service-requests:*');
 */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const redis = await getRedisClient();
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
      console.log(`Redis: Invalidated ${keys.length} cache entries matching '${pattern}'`);
    }
  } catch (error) {
    console.warn('Redis: Cache invalidation failed:', error);
    // Non-fatal - cache will expire naturally
  }
}

/**
 * Check if Redis is available
 * Useful for health checks
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

/**
 * Get cache statistics
 * Useful for monitoring
 */
export async function getCacheStats(): Promise<{
  connected: boolean;
  keys: number;
  memory: string;
}> {
  try {
    const redis = await getRedisClient();
    const info = await redis.info('memory');
    const keyCount = await redis.dbSize();

    const memoryMatch = info.match(/used_memory_human:(\S+)/);
    const memory = memoryMatch ? memoryMatch[1] : 'unknown';

    return {
      connected: true,
      keys: keyCount,
      memory,
    };
  } catch {
    return {
      connected: false,
      keys: 0,
      memory: 'N/A',
    };
  }
}

export default {
  getRedisClient,
  withCache,
  buildCacheKey,
  invalidateCache,
  isRedisAvailable,
  getCacheStats,
};
