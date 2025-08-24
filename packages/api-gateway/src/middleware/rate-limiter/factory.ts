import { RequestHandler, Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { failure } from '../../utils/response.utils';
import { API_RESPONSES } from '../../constants';
import { REDIS_RATE_LIMIT } from '../../constants/redis.constants';

interface RateLimiterOptions {
  capacity: number;
  refillRate: number; // tokens per second
  bucketPrefix?: string;
}

export function createTokenBucketLimiter(
  options: RateLimiterOptions
): RequestHandler {
  const {
    capacity,
    refillRate,
    bucketPrefix = REDIS_RATE_LIMIT.tokenBucketPrefix,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    const redis: Redis = req.redis;
    const apiKey = req.header('x-api-key') || (req.query.apiKey as string);

    if (!apiKey) {
      return failure(
        res,
        400,
        API_RESPONSES.RATE_LIMIT_ERRORS.RATE_LIMIT_API_KEY_MISSING
      );
    }

    const bucketKey = `${bucketPrefix}${apiKey}`;

    try {
      const now = Date.now();
      const bucketData = await redis.hmget(
        bucketKey,
        'tokens',
        'lastRefillTime'
      );

      const tokens = Number(bucketData[0]) || capacity;
      const lastRefillTime = Number(bucketData[1]) || now;

      const timeElapsed = (now - lastRefillTime) / 1000;
      const tokensToAdd = timeElapsed * refillRate;
      const newTokens = Math.min(capacity, tokens + tokensToAdd);

      if (newTokens < 1) {
        return failure(
          res,
          429,
          API_RESPONSES.RATE_LIMIT_ERRORS.TOO_MANY_REQUESTS
        );
      }

      await redis.hmset(bucketKey, {
        tokens: newTokens - 1,
        lastRefillTime: now,
      });
      await redis.expire(bucketKey, 86400);

      res.setHeader('X-RateLimit-Limit', capacity);
      res.setHeader('X-RateLimit-Remaining', Math.floor(newTokens - 1));
      res.setHeader(
        'X-RateLimit-Reset',
        Math.ceil(now / 1000 + (capacity - newTokens + 1) / refillRate)
      );

      next();
    } catch (err) {
      next(err);
    }
  };
}
