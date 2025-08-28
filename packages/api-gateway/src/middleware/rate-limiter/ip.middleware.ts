import { NextFunction, Request, Response } from 'express';
import Redis from 'ioredis';
import { logger } from '../../utils/logger.utils';
import { config } from '../../config';
import { API_RESPONSES } from '../../constants';
import { REDIS_RATE_LIMIT } from '../../constants/redis.constants';
import { failure } from '../../utils/response.utils';

export const ipRateLimiterMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const clientIp = req.clientIp;
  if (!clientIp) {
    return failure(res, 400, API_RESPONSES.GEO_BLOCK_ERRORS.IP_NOT_FOUND);
  }

  const redis: Redis = req.redis;
  if (!redis) {
    logger.error('Redis client not available');
    return failure(res, 500, API_RESPONSES.SYSTEM_ERRORS.INTERNAL_SERVER_ERROR);
  }

  const defaultCapacity = config.ratelimit.defaultCapacity;
  const defaultRefillTokens = config.ratelimit.defaultRefillTokens;
  if (defaultCapacity <= 0 || defaultRefillTokens <= 0) {
    console.error('Invalid rate limit configuration');
    return failure(res, 500, 'Internal server error');
  }

  const bucketKey = `${REDIS_RATE_LIMIT.tokenBucketPrefix}${clientIp}`;
  const now = Date.now();

  const bucketData = await redis.hmget(bucketKey, 'tokens', 'lastRefillTime');

  const tokens = Number(bucketData[0]) || config.ratelimit.defaultCapacity;
  const lastRefillTime = Number(bucketData[1]) || now;

  const timeElapsed = (now - lastRefillTime) / 1000;
  const tokensToAdd = timeElapsed * config.ratelimit.defaultRefillTokens;
  const newTokens = Math.min(
    config.ratelimit.defaultCapacity,
    tokens + tokensToAdd
  );

  if (newTokens < 1) {
    return failure(res, 429, API_RESPONSES.RATE_LIMIT_ERRORS.TOO_MANY_REQUESTS);
  }

  await redis.hmset(bucketKey, {
    tokens: newTokens - 1,
    lastRefillTime: now,
  });
  await redis.expire(bucketKey, 3600);

  res.setHeader('X-RateLimit-Limit', config.ratelimit.defaultCapacity);
  res.setHeader('X-RateLimit-Remaining', Math.floor(newTokens - 1));
  res.setHeader(
    'X-RateLimit-Reset',
    Math.ceil(
      now / 1000 +
        (config.ratelimit.defaultCapacity - newTokens + 1) /
          config.ratelimit.defaultRefillTokens
    )
  );

  next();
};
