import { AuthenticatedRequest } from '@shared/types';
import { NextFunction, Request, Response } from 'express';
import { Redis } from 'ioredis';
import { API_RESPONSES } from '../../constants';
import { logger } from '../../utils/logger.utils';
import { failure } from '../../utils/response.utils';

const ensurePrefix = (p: string) => (p ? (p.endsWith(':') ? p : p + ':') : '');

export const makeKey = (prefix: string, id: string) =>
  `${ensurePrefix(prefix)}${id}`;

type GetIdFn = (
  req: Request
) => string | undefined | Promise<string | undefined>;

export function fixedWindowMiddlewareFactory(opts: {
  getId: GetIdFn;
  keyPrefix: string;
  limit: number;
  windowsSeconds: number;
  headerPrefix?: string;
}) {
  const headerPrefix = opts.headerPrefix ?? 'X-RateLimit';
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const id = await opts.getId(req);
      if (!id) {
        return failure(
          res,
          400,
          API_RESPONSES.RATE_LIMIT_ERRORS.RATE_LIMIT_API_KEY_MISSING
        );
      }

      const redis: Redis = req.redis;
      if (!redis) {
        logger.error('Redis client not available');
        return failure(
          res,
          500,
          API_RESPONSES.SYSTEM_ERRORS.INTERNAL_SERVER_ERROR
        );
      }

      const key = makeKey(opts.keyPrefix, id);
      const requests = await redis.incr(key);
      if (requests === 1) {
        await redis.expire(key, opts.windowsSeconds);
      }

      if (requests > opts.limit) {
        return failure(
          res,
          429,
          API_RESPONSES.RATE_LIMIT_ERRORS.TOO_MANY_REQUESTS
        );
      }

      res.setHeader(`${headerPrefix}-limit`, String(opts.limit));
      res.setHeader(
        `${headerPrefix}-Remaining`,
        String(Math.max(0, opts.limit - requests))
      );
      const ttl = await redis.ttl(key);
      if (ttl > 0) {
        res.setHeader(
          `${headerPrefix}-Reset`,
          String(Math.floor(Date.now() / 1000 + ttl))
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

export function tokenBucketMiddlewareFactory(opts: {
  getId: GetIdFn;
  keyPrefix: string;
  getCapacity: (req: Request, id: string) => Promise<number> | number;
  getRefillRate: (req: Request, id: string) => Promise<number> | number;
  ttlSeconds?: number;
  headerPrefix?: string;
}) {
  const ttl = opts.ttlSeconds ?? 3600;
  const headerPrefix = opts.headerPrefix ?? 'X-RateLimit';

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = await opts.getId(req);
      if (!id) {
        return failure(
          res,
          400,
          API_RESPONSES.RATE_LIMIT_ERRORS.RATE_LIMIT_API_KEY_MISSING
        );
      }

      const redis: Redis = req.redis;
      if (!redis) {
        logger.error('Redis client not available');
        return failure(
          res,
          500,
          API_RESPONSES.SYSTEM_ERRORS.INTERNAL_SERVER_ERROR
        );
      }

      const capacity = await opts.getCapacity(req, id);
      const refillRate = await opts.getRefillRate(req, id);
      if (capacity <= 0 || refillRate <= 0) {
        logger.error('Invalid Rate Limit Configuration');
        return failure(
          res,
          500,
          API_RESPONSES.SYSTEM_ERRORS.INTERNAL_SERVER_ERROR
        );
      }

      const key = makeKey(opts.keyPrefix, id);
      const now = Date.now();

      // read tokens & lastRefill
      const [tokensStr, lastRefillStr] = await redis.hmget(
        key,
        'tokens',
        'lastRefillTime'
      );

      const tokens = Number(tokensStr) || capacity;
      const lastRefill = Number(lastRefillStr) || now;

      const elapsedSeconds = (now - lastRefill) / 1000;
      const tokensToAdd = elapsedSeconds * refillRate;
      const newTokens = Math.min(capacity, tokens + tokensToAdd);

      if (newTokens < 1) {
        const secondsUntilOne = Math.ceil((1 - newTokens) / refillRate);
        res.setHeader(`${headerPrefix}-limit`, String(capacity));
        res.setHeader(`${headerPrefix}-Remaining`, 0);
        res.setHeader(
          `${headerPrefix}-Reset`,
          String(Math.floor(now / 1000 + secondsUntilOne))
        );

        return failure(
          res,
          429,
          API_RESPONSES.RATE_LIMIT_ERRORS.TOO_MANY_REQUESTS
        );
      }

      // consume 1 token and persist state
      const newTokenCount = newTokens - 1;
      await redis.hmset(key, {
        tokens: String(newTokenCount),
        lastRefillTime: String(now),
      });
      await redis.expire(key, ttl);

      res.setHeader(`${headerPrefix}-limit`, String(capacity));
      res.setHeader(
        `${headerPrefix}-Remaining`,
        String(Math.floor(newTokenCount))
      );
      res.setHeader(
        `${headerPrefix}-Reset`,
        String(Math.ceil(now / 1000 + (capacity - newTokens + 1) / refillRate))
      );

      next();
    } catch (err) {
      next(err);
    }
  };
}
