import { Request } from 'express';
import { tokenBucketMiddlewareFactory } from './factories';
import { REDIS_RATE_LIMIT } from '../../constants/redis.constants';
import { config } from '../../config';
import { RateLimitService } from 'src/services/rate-limit.service';

const getApiKey = (req: Request) => req.header('x-api-key');

export const apiKeyRateLimiterMiddleware = tokenBucketMiddlewareFactory({
  getId: getApiKey,
  keyPrefix: REDIS_RATE_LIMIT.tokenBucketPrefix,
  // getCapacity: () => config.ratelimit.defaultCapacity,
  getCapacity: async (req: Request, apiKey: string) => {
    const defaults = {
      capacity: config.ratelimit.defaultCapacity,
      refillRate: config.ratelimit.defaultRefillTokens,
    };
    const { capacity } = await RateLimitService.getConfig(
      req.redis,
      apiKey,
      defaults
    );
    return capacity;
  },
  // getRefillRate: () => config.ratelimit.defaultRefillTokens,
  getRefillRate: async (req: Request, apiKey: string) => {
    const defaults = {
      capacity: config.ratelimit.defaultCapacity,
      refillRate: config.ratelimit.defaultRefillTokens,
    };
    const { refillRate } = await RateLimitService.getConfig(
      req.redis,
      apiKey,
      defaults
    );
    return refillRate;
  },
  ttlSeconds: 3600,
  headerPrefix: 'X-RateLimit',
});
