import { Request, RequestHandler, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { failure } from '../utils/response.utils';
import { API_RESPONSES } from '../constants';
import { config } from '../config';
import { REDIS_RATE_LIMIT } from '../constants/redis.constants';

const DEFAULT_CAPACITY = config.ratelimit.defaultCapacity || 60; // tokens
const DEFAULT_REFILL_TOKENS = config.ratelimit.defaultRefillTokens || 1; // per interval
const DEFAULT_REFILL_INTERVAL = config.ratelimit.defaultRefillInterval || 1; // in seconds
const DEFAULT_REFILL_RATE = DEFAULT_REFILL_TOKENS / DEFAULT_REFILL_INTERVAL; // tokens per second
const API_KEY_PREFIX = REDIS_RATE_LIMIT.apiKeyPrefix;
const TOKEN_BUCKET_PREFIX = REDIS_RATE_LIMIT.tokenBucketPrefix;

export const rateLimiterMiddleware: RequestHandler = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const redis: Redis = req.redis;

    // 1. Extract API key
    const apiKey = req.header('x-api-key') || (req.query.apiKey as string);
    if (!apiKey) {
      return failure(
        res,
        400,
        API_RESPONSES.RATE_LIMIT_ERRORS.RATE_LIMIT_API_KEY_MISSING
      );
    }

    try {
      // 2. Get rate limit config
      const configKey = `${API_KEY_PREFIX}${apiKey}`;
      const config = await redis.hgetall(configKey);

      const capacity = Number(config.capacity) || DEFAULT_CAPACITY;
      const refillRate = Number(config.refillRate) || DEFAULT_REFILL_RATE;

      // 3. Get current bucket state
      const bucketKey = `${TOKEN_BUCKET_PREFIX}${apiKey}`;
      const bucketData = await redis.hmget(
        bucketKey,
        'tokens',
        'lastRefillTime'
      );

      const now = Date.now();
      const tokens = Number(bucketData[0]) || capacity;
      const lastRefillTime = Number(bucketData[1]) || now;

      // Calculate tokens to add based on time elapsed
      const timeElapsed = (now - lastRefillTime) / 1000; // convert to seconds
      const tokensToAdd = timeElapsed * refillRate;
      const newTokens = Math.min(capacity, tokens + tokensToAdd);

      // Attempt to consume one token
      if (newTokens < 1) {
        return failure(
          res,
          500,
          API_RESPONSES.RATE_LIMIT_ERRORS.TOO_MANY_REQUESTS
        );
      }

      // Update bucket
      await redis.hmset(bucketKey, {
        tokens: newTokens - 1, // consume one token
        lastRefillTime: now,
      });

      // Set TTL to ensure cleanup of abandoned buckets
      await redis.expire(bucketKey, 86400); // 24 hours

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', capacity);
      res.setHeader('X-RateLimit-Remaining', Math.floor(newTokens - 1));
      res.setHeader(
        'X-RateLimit-Reset',
        Math.ceil(now / 1000 + (capacity - newTokens + 1) / refillRate)
      );

      next();
    } catch (error) {
      next(error);
    }
  };
};
