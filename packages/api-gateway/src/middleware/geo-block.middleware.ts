import { NextFunction, Request, Response } from 'express';
import geoip from 'geoip-lite';
import Redis from 'ioredis';
import { API_RESPONSES } from '../constants';
import { logger } from '../utils/logger.utils';
import { failure } from '../utils/response.utils';
import { getClientIp } from '../utils/get-client-ip';
import { REDIS_GEO_BLOCK_KEY } from '../constants/redis.constants';

export const geoBlockMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const clientIp = getClientIp(req);
  if (!clientIp) {
    return failure(res, 400, API_RESPONSES.GEO_BLOCK_ERRORS.INVALID_IP);
  }
  const redis: Redis = req.redis;

  try {
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

    next();
  } catch (error) {
    logger.error('Error in geo-block middleware: ', error);
    next(error);
  }
};
