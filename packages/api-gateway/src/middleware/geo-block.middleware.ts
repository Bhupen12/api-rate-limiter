import { NextFunction, Request, Response } from 'express';
import geoip from 'geoip-lite';
import Redis from 'ioredis';
import { API_RESPONSES } from '../constants';
import { logger } from '../utils/logger.utils';
import { failure } from '../utils/response.utils';
import { getClientIp } from '../utils/get-client-ip';
import { REDIS_GEO_BLOCK_KEY } from '../constants/redis.constants';
import { ReputationService } from 'src/services/reputation/reputation.service';
import { IPQualityScoreAdapter } from 'src/services/reputation/ipqualityscore.adapter';
import { config } from 'src/config';
import { isPrivate } from 'ip';
import { ReputationResult } from 'src/types/ip-reputation';

const reputationAdapter = new ReputationService([new IPQualityScoreAdapter()]);
const REPUTATION_CACHE_TTL = config.ipqualityscore.reputationCacheTtl;
const REPUTATION_BLOCK_THRESHOLD =
  config.ipqualityscore.reputationBlockThreshold;

export const geoBlockMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Skip for health checks
  if (req.path === '/healthz') {
    return next();
  }

  const clientIp = getClientIp(req);
  if (!clientIp) {
    return failure(res, 400, API_RESPONSES.GEO_BLOCK_ERRORS.INVALID_IP);
  }
  const redis: Redis = req.redis;

  try {
    // Skip checks for private IPs
    if (isPrivate(clientIp)) {
      return next();
    }

    // check whitelist
    const isWhiteListed = await redis.sismember(
      REDIS_GEO_BLOCK_KEY.ipWhitelist,
      clientIp
    );
    if (isWhiteListed) {
      return next();
    }

    // check blacklist
    const isBlackListed = await redis.sismember(
      REDIS_GEO_BLOCK_KEY.ipBlacklist,
      clientIp
    );
    if (isBlackListed) {
      logger.warn(`Blocked request from blacklisted IP: ${clientIp}`);
      return failure(res, 403, API_RESPONSES.GEO_BLOCK_ERRORS.BLOCKED);
    }

    // check country
    const geo = geoip.lookup(clientIp);
    if (geo && geo.country) {
      const isCountryBlocked = await redis.sismember(
        REDIS_GEO_BLOCK_KEY.countryBlocklist,
        geo.country
      );
      if (isCountryBlocked) {
        logger.warn(
          `Blocked request from blocked country: ${geo.country} (IP: ${clientIp})`
        );
        return failure(res, 403, API_RESPONSES.GEO_BLOCK_ERRORS.BLOCKED);
      }
    }

    const repKey = `ip:rep:${clientIp}`;
    const cached = await redis.get(repKey);
    let reputations: ReputationResult[];

    if (!cached) {
      reputations = await reputationAdapter.check(clientIp);
      await redis.set(
        repKey,
        JSON.stringify(reputations),
        'EX',
        REPUTATION_CACHE_TTL
      );
    } else {
      reputations = JSON.parse(cached) as ReputationResult[];
    }

    const maxScore = Math.max(...reputations.map((r) => r.score ?? 0));
    if (maxScore >= REPUTATION_BLOCK_THRESHOLD) {
      logger.warn(
        `Blocked request from IP with high reputation score: ${clientIp} (Score: ${maxScore})`
      );
      return failure(res, 403, API_RESPONSES.GEO_BLOCK_ERRORS.BLOCKED);
    }

    next();
  } catch (error) {
    logger.error('Error in geo-block middleware: ', error);
    next(error);
  }
};
