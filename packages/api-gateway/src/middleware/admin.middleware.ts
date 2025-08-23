import { Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { failure } from '../utils/response.utils';
import { API_RESPONSES } from '../constants';
import { AuthenticatedRequest } from '@shared/types';

const ADMIN_RATE_LIMIT = 100; // 100 requests
const WINDOW_SIZE = 60 * 60; // 1 hour in seconds
const ADMIN_RATE_KEY_PREFIX = 'admin-rate-limit:';

export const adminRateLimiterMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const redis: Redis = req.redis;
  const userId = req.user?.id;

  if (!userId) {
    return failure(res, 401, API_RESPONSES.AUTH_ERRORS.AUTHENTICATION_REQUIRED);
  }

  const key = `${ADMIN_RATE_KEY_PREFIX}${userId}`;

  try {
    const requests = await redis.incr(key);

    if (requests === 1) {
      await redis.expire(key, WINDOW_SIZE);
    }

    if (requests > ADMIN_RATE_LIMIT) {
      return failure(
        res,
        429,
        API_RESPONSES.RATE_LIMIT_ERRORS.TOO_MANY_REQUESTS
      );
    }

    res.setHeader('X-Admin-RateLimit-Limit', ADMIN_RATE_LIMIT);
    res.setHeader('X-Admin-RateLimit-Remaining', ADMIN_RATE_LIMIT - requests);

    next();
  } catch (error) {
    next(error);
  }
};
