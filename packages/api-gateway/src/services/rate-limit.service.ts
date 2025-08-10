import { Redis } from 'ioredis';
import { logger } from '../utils/logger.utils';

const CONFIG_KEY = 'rl:config';

export class RateLimitService {
  static async updateConfig(
    client: Redis,
    config: { apiKey: string; capacity: number; refillRate: number }
  ) {
    await client.hset(
      CONFIG_KEY,
      config.apiKey,
      JSON.stringify({
        capacity: config.capacity,
        refillRate: config.refillRate,
      })
    );
    logger.info(`Rate limit config updated for ${config.apiKey}`);
    return config;
  }

  static async getConfig(
    client: Redis,
    apiKey: string,
    defaults: { capacity: number; refillRate: number }
  ) {
    const raw = await client.hget(CONFIG_KEY, apiKey);
    if (!raw) return { apiKey, ...defaults, isDefault: true };

    try {
      return { apiKey, ...JSON.parse(raw), isDefault: false };
    } catch {
      return { apiKey, ...defaults, isDefault: true };
    }
  }

  static async deleteConfig(client: Redis, apiKey: string) {
    return (await client.hdel(CONFIG_KEY, apiKey)) > 0;
  }

  static async listConfigs(client: Redis) {
    const all = await client.hgetall(CONFIG_KEY);
    return Object.entries(all).map(([apiKey, val]) => ({
      apiKey,
      ...JSON.parse(val),
    }));
  }
}
