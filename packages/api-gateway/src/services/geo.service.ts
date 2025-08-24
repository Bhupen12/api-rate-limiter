import geoip from 'geoip-lite';
import { logger } from '../utils/logger.utils';

export class GeoService {
  static lookup(ip: string): geoip.Lookup | null {
    try {
      const geo = geoip.lookup(ip);
      return geo;
    } catch (error) {
      logger.error(`Failed to perform geo lookup for IP ${ip}:`, error);
      return null;
    }
  }
}
