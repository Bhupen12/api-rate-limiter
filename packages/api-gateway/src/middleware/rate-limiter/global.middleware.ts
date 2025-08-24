import { createTokenBucketLimiter } from './factory';
import { config } from '../../config';
import { RequestHandler } from 'express';

const DEFAULT_CAPACITY = config.ratelimit.defaultCapacity || 60;
const DEFAULT_REFILL_TOKENS = config.ratelimit.defaultRefillTokens || 1;
const DEFAULT_REFILL_INTERVAL = config.ratelimit.defaultRefillInterval || 1;
const DEFAULT_REFILL_RATE = DEFAULT_REFILL_TOKENS / DEFAULT_REFILL_INTERVAL;

export const globalRateLimiterMiddleware: RequestHandler =
  createTokenBucketLimiter({
    capacity: DEFAULT_CAPACITY,
    refillRate: DEFAULT_REFILL_RATE,
  });
