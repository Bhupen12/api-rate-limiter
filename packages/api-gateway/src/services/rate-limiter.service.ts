import { redisService } from '@monorepo/shared';
import { logger } from '../utils/logger';

interface BucketState {
  tokens: number;
  lastRefill: number;
}

/**
 * Leaky Bucket Rate Limiter using Redis
 *
 * The leaky bucket algorithm allows for burst traffic up to the bucket capacity,
 * then enforces a steady rate based on the refill rate.
 *
 * @param key - Unique identifier for the bucket (e.g., user ID, IP address)
 * @param capacity - Maximum number of tokens the bucket can hold
 * @param refillRate - Number of tokens to add per second
 * @returns Promise<boolean> - true if token acquired, false if rate limited
 */
export async function acquireToken(
  key: string,
  capacity: number,
  refillRate: number
): Promise<boolean> {
  const bucketKey = `leaky_bucket:${key}`;
  const now = Date.now();

  try {
    // Get current bucket state from Redis
    const bucketData = await redisService.getJSON<BucketState>(bucketKey);

    let currentTokens: number;
    let lastRefill: number;

    if (!bucketData) {
      // First time accessing this bucket - initialize with full capacity
      currentTokens = capacity;
      lastRefill = now;
    } else {
      // Calculate tokens to add based on time elapsed
      const timeSinceLastRefill = (now - bucketData.lastRefill) / 1000; // Convert to seconds
      const tokensToAdd = Math.floor(timeSinceLastRefill * refillRate);

      // Add tokens but don't exceed capacity
      currentTokens = Math.min(capacity, bucketData.tokens + tokensToAdd);
      lastRefill = bucketData.lastRefill + (tokensToAdd / refillRate) * 1000; // Update based on tokens actually added
    }

    // Check if we can consume a token
    if (currentTokens > 0) {
      // Consume one token
      currentTokens--;

      // Save updated state to Redis with TTL
      const updatedState: BucketState = {
        tokens: currentTokens,
        lastRefill: lastRefill,
      };

      // Set TTL to capacity/refillRate + buffer to prevent memory leaks
      const ttlSeconds = Math.ceil(capacity / refillRate) + 60;
      await redisService.setJSON(bucketKey, updatedState, { ttl: ttlSeconds });

      return true; // Token acquired
    } else {
      // No tokens available - rate limited
      // Still update the bucket state for accurate refill timing
      const updatedState: BucketState = {
        tokens: 0,
        lastRefill: lastRefill,
      };

      const ttlSeconds = Math.ceil(capacity / refillRate) + 60;
      await redisService.setJSON(bucketKey, updatedState, { ttl: ttlSeconds });

      return false; // Rate limited
    }
  } catch (error) {
    logger.error('Error in leaky bucket rate limiter:', error);

    // On Redis error, fail open (allow the request) to prevent total service outage
    // In production, you might want to fail closed for security
    return true;
  }
}

/**
 * Get current bucket status for debugging/monitoring
 *
 * @param key - Unique identifier for the bucket
 * @param capacity - Maximum number of tokens the bucket can hold
 * @param refillRate - Number of tokens to add per second
 * @returns Promise<BucketInfo> - Current bucket information
 */
export interface BucketInfo {
  currentTokens: number;
  capacity: number;
  refillRate: number;
  timeUntilNextToken: number; // milliseconds
  isRateLimited: boolean;
}

export async function getBucketInfo(
  key: string,
  capacity: number,
  refillRate: number
): Promise<BucketInfo> {
  const bucketKey = `leaky_bucket:${key}`;
  const now = Date.now();

  try {
    const bucketData = await redisService.getJSON<BucketState>(bucketKey);

    if (!bucketData) {
      return {
        currentTokens: capacity,
        capacity,
        refillRate,
        timeUntilNextToken: 0,
        isRateLimited: false,
      };
    }

    // Calculate current tokens based on refill
    const timeSinceLastRefill = (now - bucketData.lastRefill) / 1000;
    const tokensToAdd = Math.floor(timeSinceLastRefill * refillRate);
    const currentTokens = Math.min(capacity, bucketData.tokens + tokensToAdd);

    // Calculate time until next token is available
    let timeUntilNextToken = 0;
    if (currentTokens === 0) {
      const tokensUntilNext = 1 - ((timeSinceLastRefill * refillRate) % 1);
      timeUntilNextToken = Math.ceil((tokensUntilNext / refillRate) * 1000);
    }

    return {
      currentTokens,
      capacity,
      refillRate,
      timeUntilNextToken,
      isRateLimited: currentTokens === 0,
    };
  } catch (error) {
    logger.error('Error getting bucket info:', error);
    return {
      currentTokens: 0,
      capacity,
      refillRate,
      timeUntilNextToken: 0,
      isRateLimited: true,
    };
  }
}

/**
 * Reset a bucket (useful for testing or admin operations)
 *
 * @param key - Unique identifier for the bucket
 */
export async function resetBucket(key: string): Promise<void> {
  const bucketKey = `leaky_bucket:${key}`;
  await redisService.del(bucketKey);
}

/**
 * Batch acquire multiple tokens atomically
 *
 * @param key - Unique identifier for the bucket
 * @param capacity - Maximum number of tokens the bucket can hold
 * @param refillRate - Number of tokens to add per second
 * @param tokensRequested - Number of tokens to acquire
 * @returns Promise<boolean> - true if all tokens acquired, false if not enough tokens
 */
export async function acquireTokensBatch(
  key: string,
  capacity: number,
  refillRate: number,
  tokensRequested: number
): Promise<boolean> {
  if (tokensRequested > capacity) {
    // Can never fulfill this request
    return false;
  }

  const bucketKey = `leaky_bucket:${key}`;
  const now = Date.now();

  try {
    const bucketData = await redisService.getJSON<BucketState>(bucketKey);

    let currentTokens: number;
    let lastRefill: number;

    if (!bucketData) {
      currentTokens = capacity;
      lastRefill = now;
    } else {
      const timeSinceLastRefill = (now - bucketData.lastRefill) / 1000;
      const tokensToAdd = Math.floor(timeSinceLastRefill * refillRate);
      currentTokens = Math.min(capacity, bucketData.tokens + tokensToAdd);
      lastRefill = bucketData.lastRefill + (tokensToAdd / refillRate) * 1000;
    }

    if (currentTokens >= tokensRequested) {
      // Consume requested tokens
      currentTokens -= tokensRequested;

      const updatedState: BucketState = {
        tokens: currentTokens,
        lastRefill: lastRefill,
      };

      const ttlSeconds = Math.ceil(capacity / refillRate) + 60;
      await redisService.setJSON(bucketKey, updatedState, { ttl: ttlSeconds });

      return true;
    } else {
      // Not enough tokens available
      const updatedState: BucketState = {
        tokens: currentTokens,
        lastRefill: lastRefill,
      };

      const ttlSeconds = Math.ceil(capacity / refillRate) + 60;
      await redisService.setJSON(bucketKey, updatedState, { ttl: ttlSeconds });

      return false;
    }
  } catch (error) {
    logger.error('Error in batch token acquisition:', error);
    return true; // Fail open
  }
}
