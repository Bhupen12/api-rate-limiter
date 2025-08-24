import { Request, Response } from 'express';
import { API_RESPONSES } from '../constants';
import { failure, success } from '../utils/response.utils';
import { isIP } from 'net';
import {
  REDIS_CHANNELS,
  REDIS_GEO_BLOCK_KEY,
} from '../constants/redis.constants';

export class GeoBlockController {
  static async addToIpWhiteList(req: Request, res: Response) {
    const { ip } = req.body;
    if (!ip || !isIP(ip)) {
      return failure(res, 400, API_RESPONSES.GEO_BLOCK_ERRORS.INVALID_IP);
    }
    await req.redis.sadd(REDIS_GEO_BLOCK_KEY.ipWhitelist, ip);
    await req.redis.publish(REDIS_CHANNELS.invalidation, 'reload');
    const response = { ip: ip };
    return success(res, response, 'IP added to whitelist successfully');
  }

  static async addToIpBlacklist(req: Request, res: Response) {
    const { ip } = req.body;
    if (!ip || !isIP(ip)) {
      return failure(res, 400, API_RESPONSES.GEO_BLOCK_ERRORS.INVALID_IP);
    }
    await req.redis.sadd(REDIS_GEO_BLOCK_KEY.ipBlacklist, ip);
    await req.redis.publish(REDIS_CHANNELS.invalidation, 'reload');
    const response = { ip: ip };
    return success(res, response, 'IP added to blacklist successfully');
  }

  static async addToCountryBlocklist(req: Request, res: Response) {
    const { country } = req.body;
    if (!country || typeof country !== 'string') {
      return failure(res, 400, API_RESPONSES.GEO_BLOCK_ERRORS.INVALID_COUNTRY);
    }
    await req.redis.sadd(REDIS_GEO_BLOCK_KEY.countryBlocklist, country);
    await req.redis.publish(REDIS_CHANNELS.invalidation, 'reload');
    const response = { country: country };
    return success(res, response, 'Country added to blocklist successfully');
  }

  static async removeFromIpWhiteList(req: Request, res: Response) {
    const { ip } = req.params;
    await req.redis.srem(REDIS_GEO_BLOCK_KEY.ipWhitelist, ip);
    await req.redis.publish(REDIS_CHANNELS.invalidation, 'reload');
    const response = { ip: ip };
    return success(res, response, 'IP removed from whitelist successfully');
  }

  static async removeFromIpBlacklist(req: Request, res: Response) {
    const { ip } = req.params;
    await req.redis.srem(REDIS_GEO_BLOCK_KEY.ipBlacklist, ip);
    await req.redis.publish(REDIS_CHANNELS.invalidation, 'reload');
    const response = { ip: ip };
    return success(res, response, 'IP removed from blacklist successfully');
  }

  static async removeFromCountryBlocklist(req: Request, res: Response) {
    const { countryCode } = req.params;
    await req.redis.srem(REDIS_GEO_BLOCK_KEY.countryBlocklist, countryCode);
    await req.redis.publish(REDIS_CHANNELS.invalidation, 'reload');
    const response = { country: countryCode };
    return success(
      res,
      response,
      'Country removed from blocklist successfully'
    );
  }

  static async listWhitelist(req: Request, res: Response) {
    const ips = await req.redis.smembers(REDIS_GEO_BLOCK_KEY.ipWhitelist);
    return success(res, ips, 'IP whitelist retrieved successfully');
  }

  static async listBlacklist(req: Request, res: Response) {
    const ips = await req.redis.smembers(REDIS_GEO_BLOCK_KEY.ipBlacklist);
    return success(res, ips, 'IP blacklist retrieved successfully');
  }

  static async listCountryBlocklist(req: Request, res: Response) {
    const countries = await req.redis.smembers(
      REDIS_GEO_BLOCK_KEY.countryBlocklist
    );
    return success(res, countries, 'Country blocklist retrieved successfully');
  }
}
