import { NextFunction, Request, Response } from 'express';
import geoip from 'geoip-lite';
import Redis from 'ioredis';
import { API_RESPONSES } from 'src/constants';
import { logger } from 'src/utils/logger.utils';
import { failure } from 'src/utils/response.utils';
import { getClientIp } from '../utils/get-client-ip';

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
    const isWhiteListed = await redis.sismember('geo:whitelist:ips', clientIp);
    if (isWhiteListed) {
      return next();
    }

    // check blacklist
    const isBlackListed = await redis.sismember('geo:blocklist:ips', clientIp);
    if (isBlackListed) {
      logger.warn(`Blocked request from blacklisted IP: ${clientIp}`);
      return failure(res, 403, API_RESPONSES.GEO_BLOCK_ERRORS.BLOCKED);
    }

    // check country
    const geo = geoip.lookup(clientIp);
    if (geo && geo.country) {
      const isCountryBlocked = await redis.sismember(
        'geo:blocklist:countries',
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
