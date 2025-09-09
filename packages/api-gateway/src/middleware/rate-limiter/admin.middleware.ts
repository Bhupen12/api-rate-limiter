import { AuthenticatedRequest } from '@shared/types';
import { fixedWindowMiddlewareFactory } from './factories';
import { REDIS_RATE_LIMIT } from '../../constants/redis.constants';
import { config } from '../../config';

const getUserId = (req: AuthenticatedRequest) => req.user?.id;

export const adminRateLimiterMiddleware = fixedWindowMiddlewareFactory({
  getId: getUserId,
  keyPrefix: REDIS_RATE_LIMIT.adminRatePrefix,
  limit: config.ratelimit.adminRateLimit,
  windowsSeconds: config.ratelimit.adminRateWindow,
  headerPrefix: 'X-Admin-RateLimit',
});
