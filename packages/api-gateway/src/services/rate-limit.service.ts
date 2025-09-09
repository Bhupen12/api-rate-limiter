import { Redis } from 'ioredis';
import { logger } from '../utils/logger.utils';

const CONFIG_KEY = 'rl:config';

type StoredConfig = {
  capacity: number;
  refillRate: number;
};

export class RateLimitService {
  static async updateConfig(
    client: Redis,
    config: { apiKey: string; capacity: number; refillRate: number }
  ) {
    if (!config.apiKey) throw new Error('apiKey required');
    if (!Number.isFinite(config.capacity) || config.capacity <= 0) {
      throw new Error('capacity must be a positive number');
    }
    if (!Number.isFinite(config.refillRate) || config.refillRate <= 0) {
      throw new Error('refillRate must be a positive number');
    }

    const payload = JSON.stringify({
      capacity: config.capacity,
      refillRate: config.refillRate,
    });

    await client.hset(CONFIG_KEY, config.apiKey, payload);
    logger.info(`Rate limit config updated for ${config.apiKey}`);
    return {
      apiKey: config.apiKey,
      capacity: config.capacity,
      refillRate: config.refillRate,
    };
  }

  static async getConfig(
    client: Redis,
    apiKey: string,
    defaults: { capacity: number; refillRate: number }
  ) {
    const raw = await client.hget(CONFIG_KEY, apiKey);
    if (!raw) return { apiKey, ...defaults, isDefault: true };

    try {
      const parsed = JSON.parse(raw) as StoredConfig;
      return { apiKey, ...parsed, isDefault: false };
    } catch {
      return { apiKey, ...defaults, isDefault: true };
    }
  }

  static async deleteConfig(client: Redis, apiKey: string) {
    const removed = await client.hdel(CONFIG_KEY, apiKey);
    return removed > 0;
  }

  static async listConfigs(client: Redis) {
    const all = await client.hgetall(CONFIG_KEY);
    return Object.entries(all).map(([apiKey, val]) => {
      try {
        return { apiKey, ...JSON.parse(val) };
      } catch {
        return { apiKey, capacity: null, refillRate: null, invalid: true };
      }
    });
  }
}
