import { redisService } from '@monorepo/shared';
import { logger } from '../utils/logger';
import { RateLimitConfig } from '../interfaces/rate-limit.interface';
import {
  DEFAULT_RATE_LIMIT,
  RATE_LIMIT_CONFIG_KEY,
} from '../constants/rate-limit.constants';

interface RateLimitOverrides {
  [key: string]: {
    capacity: number;
    refillRate: number;
  };
}

export class RateLimitConfigService {
  private configCache: RateLimitOverrides | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute

  async getConfig(key: string): Promise<Required<RateLimitConfig>> {
    try {
      await this.refreshConfigIfNeeded();

      const overrides = this.configCache?.[key];
      if (overrides) {
        return {
          ...DEFAULT_RATE_LIMIT,
          capacity: overrides.capacity,
          refillRate: overrides.refillRate,
        };
      }

      return DEFAULT_RATE_LIMIT;
    } catch (error) {
      logger.error('Error fetching rate limit config:', error);
      return DEFAULT_RATE_LIMIT;
    }
  }

  async setConfig(
    key: string,
    capacity: number,
    refillRate: number
  ): Promise<void> {
    try {
      const configs = await this.getRawConfigs();
      configs[key] = { capacity, refillRate };

      await redisService.setJSON(RATE_LIMIT_CONFIG_KEY, configs);
      this.configCache = configs;

      logger.info('Updated rate limit config', { key, capacity, refillRate });
    } catch (error) {
      logger.error('Error setting rate limit config:', error);
      throw error;
    }
  }

  private async refreshConfigIfNeeded(): Promise<void> {
    const now = Date.now();
    if (!this.configCache || now - this.lastFetch > this.CACHE_TTL) {
      this.configCache = await this.getRawConfigs();
      this.lastFetch = now;
    }
  }

  private async getRawConfigs(): Promise<RateLimitOverrides> {
    const configs = await redisService.getJSON<RateLimitOverrides>(
      RATE_LIMIT_CONFIG_KEY
    );
    return configs || {};
  }
}

export const rateLimitConfigService = new RateLimitConfigService();
