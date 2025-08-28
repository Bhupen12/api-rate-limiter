import { NextFunction, Request, Response } from 'express';
import Redis from 'ioredis';
import { config } from '../../config';
import { API_RESPONSES } from '../../constants';
import { REDIS_RATE_LIMIT } from '../../constants/redis.constants';
import { logger } from '../../utils/logger.utils';
import { failure } from '../../utils/response.utils';

export const apiKeyRateLimiterMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.header('x-api-key');

  if (!apiKey) {
    return failure(
      res,
      400,
      API_RESPONSES.RATE_LIMIT_ERRORS.RATE_LIMIT_API_KEY_MISSING
    );
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

  const bucketKey = `${REDIS_RATE_LIMIT.tokenBucketPrefix}${apiKey}`;
  const now = Date.now();

  const bucketData = await redis.hmget(bucketKey, 'tokens', 'lastRefillTime');

  const tokens = Number(bucketData[0]) || defaultCapacity;
  const lastRefillTime = Number(bucketData[1]) || now;

  const timeElapsed = (now - lastRefillTime) / 1000;
  const tokensToAdd = timeElapsed * defaultRefillTokens;
  const newTokens = Math.min(defaultCapacity, tokens + tokensToAdd);

  if (newTokens < 1) {
    return failure(res, 429, API_RESPONSES.RATE_LIMIT_ERRORS.TOO_MANY_REQUESTS);
  }

  await redis.hmset(bucketKey, {
    tokens: newTokens - 1,
    lastRefillTime: now,
  });
  await redis.expire(bucketKey, 3600);

  res.setHeader('X-RateLimit-Limit', defaultCapacity);
  res.setHeader('X-RateLimit-Remaining', Math.floor(newTokens - 1));
  res.setHeader(
    'X-RateLimit-Reset',
    Math.ceil(
      now / 1000 + (defaultCapacity - newTokens + 1) / defaultRefillTokens
    )
  );

  next();
};
