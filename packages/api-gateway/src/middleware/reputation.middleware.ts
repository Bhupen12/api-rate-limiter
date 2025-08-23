import { NextFunction, Request, Response } from 'express';
import Redis from 'ioredis';
import { config } from '../config';
import { API_RESPONSES } from '../constants';
import { REDIS_GEO_BLOCK_KEY } from '../constants/redis.constants';
import { AbuseIPDBAdapter } from '../services/reputation/abuseipdb.adapter';
import { IPQualityScoreAdapter } from '../services/reputation/ipqualityscore.adapter';
import { ReputationService } from '../services/reputation/reputation.service';
import { ReputationResult } from '../types/ip-reputation';
import { logger } from '../utils/logger.utils';
import { failure } from '../utils/response.utils';

const reputationService = new ReputationService([
  new AbuseIPDBAdapter(),
  new IPQualityScoreAdapter(),
]);

const CACHE_KEY_PREFIX = REDIS_GEO_BLOCK_KEY.reputationPrefix;
const LOCK_KEY_PREFIX = REDIS_GEO_BLOCK_KEY.lockKeyPrefix;
const CACHE_TTL = config.reputation.cacheTtl;
const LOCK_TTL = config.reputation.lockTtl;
const REPUTATION_BLOCK_THRESHOLD = config.reputation.blockThreshold;

const isReputationBad = (results: ReputationResult[]): boolean => {
  const maxScore = ReputationService.maxScore(results);
  return maxScore >= REPUTATION_BLOCK_THRESHOLD;
};

export const reputationMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const ip = req.clientIp;
  const redis: Redis = req.redis;

  if (!ip) return next();

  try {
    // 1. Check cache first
    const cacheKey = `${CACHE_KEY_PREFIX}${ip}`;
    const cachedResult = await redis.get(cacheKey);
    if (cachedResult) {
      const results = JSON.parse(cachedResult) as ReputationResult[];
      if (isReputationBad(results)) {
        logger.warn(
          `Blocked request from IP with high reputation score: ${ip}`
        );
        return failure(res, 403, API_RESPONSES.GEO_BLOCK_ERRORS.BLOCKED);
      }
      return next();
    }

    // 2. Thundering Herd Prevention: Try to acquire a lock
    const lockKey = `${LOCK_KEY_PREFIX}${ip}`;
    const lock = await redis.set(lockKey, 'locked', 'PX', LOCK_TTL, 'NX');

    if (!lock) {
      // Could not get lock, another process is already checking this IP.
      // We can either wait a bit or just let the request pass for now.
      // Letting it pass is simpler and safer to avoid deadlocks.
      logger.debug(
        `Could not acquire lock for IP ${ip}, another check in progress. Allowing request.`
      );
      return next();
    }
    try {
      // 3. Lock acquired: Fetch from external APIs
      logger.info(`Performing reputation check for new IP: ${ip}`);
      const results = await reputationService.check(ip);

      // 4. cache the result
      await redis.set(cacheKey, JSON.stringify(results), 'EX', CACHE_TTL);

      // 5. act on fresh result
      if (isReputationBad(results)) {
        logger.warn(`Blocked IP ${ip} due to bad fresh reputation.`);
        return failure(res, 403, 'Access denied due to IP reputation.');
      }

      next();
    } finally {
      // 6. Release the lock
      await redis.del(lockKey);
    }
  } catch (error) {
    logger.error(`Error in reputation middleware for IP ${ip}:`, error);
    // Fail open: If the reputation check system fails, allow the request.
    // This prevents your own service from going down if an external API fails.
    next();
  }
};
