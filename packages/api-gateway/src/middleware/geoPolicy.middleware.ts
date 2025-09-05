import { NextFunction, Request, Response } from 'express';
import { API_RESPONSES } from '../constants';
import { GeoService } from '../services/geo.service';
import SecurityPolicyService from '../services/security-policy.service';
import { logger } from '../utils/logger.utils';
import { failure } from '../utils/response.utils';

export const geoPolicyMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const clientIp = req.clientIp;
  if (!clientIp) {
    return failure(res, 400, API_RESPONSES.GEO_BLOCK_ERRORS.INVALID_IP);
  }

  try {
    const policyService = SecurityPolicyService.getInstance();

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

    next();
  } catch (error) {
    logger.error('Error in geo-block middleware: ', error);
    next(error);
  }
};
