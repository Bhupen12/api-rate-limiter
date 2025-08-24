import { RequestHandler } from 'express';
import { createTokenBucketLimiter } from './factory';

export const authRateLimiterMiddleware: RequestHandler =
  createTokenBucketLimiter({
    capacity: 5, // max 5 requests
    refillRate: 1 / (15 * 60), // 1 token per 15 min
  });
