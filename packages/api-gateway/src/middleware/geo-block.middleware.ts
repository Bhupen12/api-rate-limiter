import { NextFunction, Request, Response } from 'express';
import Redis from 'ioredis';
import { config } from '../config';
import { API_RESPONSES } from '../constants';
import { REDIS_GEO_BLOCK_KEY } from '../constants/redis.constants';
import { GeoService } from '../services/geo.service';
import { IPQualityScoreAdapter } from '../services/reputation/ipqualityscore.adapter';
import { ReputationService } from '../services/reputation/reputation.service';
import SecurityPolicyService from '../services/security-policy.service';
import { ReputationResult } from '../types/ip-reputation';
import { logger } from '../utils/logger.utils';
import { failure } from '../utils/response.utils';

const reputationAdapter = new ReputationService([new IPQualityScoreAdapter()]);
const REPUTATION_CACHE_TTL = config.reputation.cacheTtl;
const REPUTATION_BLOCK_THRESHOLD = config.reputation.blockThreshold;

export const geoBlockMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Skip for health checks
  if (req.path === '/healthz') {
    return next();
  }

  const clientIp = req.clientIp;
  if (!clientIp) {
    return failure(res, 400, API_RESPONSES.GEO_BLOCK_ERRORS.INVALID_IP);
  }
  const redis: Redis = req.redis;

  try {
    const policyService = SecurityPolicyService.getInstance(req.redis);

    // check whitelist: Allow requests from whitelisted IPs
    if (policyService.isIpWhitelisted(clientIp)) {
      return next();
    }

    // check blacklist: Block requests from blacklisted IPs
    if (policyService.isIpBlacklisted(clientIp)) {
      logger.warn(`Blocked request from blacklisted IP: ${clientIp}`);
      return failure(res, 403, API_RESPONSES.GEO_BLOCK_ERRORS.BLOCKED);
    }

    // check country Block: Block requests from specific countries
    const geo = GeoService.lookup(clientIp);
    if (geo && policyService.isCountryBlocked(geo.country)) {
      logger.warn(
        `Blocked request from blocked country: ${geo.country} (IP: ${clientIp})`
      );
      return failure(res, 403, API_RESPONSES.GEO_BLOCK_ERRORS.BLOCKED);
    }

    const repKey = `${REDIS_GEO_BLOCK_KEY.reputationPrefix}:${clientIp}`;
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

    const maxScore = ReputationService.maxScore(reputations);
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
