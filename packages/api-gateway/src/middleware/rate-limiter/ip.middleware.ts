import { Request } from 'express';
import { tokenBucketMiddlewareFactory } from './factories';
import { REDIS_RATE_LIMIT } from '../../constants/redis.constants';
import { config } from '../../config';

const getClientIp = (req: Request) => req.clientIp;

export const ipRateLimiterMiddleware = tokenBucketMiddlewareFactory({
  getId: getClientIp,
  keyPrefix: REDIS_RATE_LIMIT.tokenBucketPrefix,
  getCapacity: async () => config.ratelimit.defaultCapacity,
  getRefillRate: async () => {
    const tokens = config.ratelimit.defaultRefillTokens;
    const interval = config.ratelimit.defaultRefillInterval;
    return tokens / interval;
  },
  ttlSeconds: 3600,
  headerPrefix: 'X-Ratelimit',
});
