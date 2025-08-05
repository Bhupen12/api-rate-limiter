// packages/shared/src/services/redis.service.ts

import { getRedisClient } from '../clients/redis';
import {
  RedisServiceInterface,
  SetOptions,
  RedisValue,
  RedisHealthCheck,
  RedisConnectionStatus,
} from '../types/redis';
import winston, { createLogger, Logger } from 'winston';

export class RedisService implements RedisServiceInterface {
  private client = getRedisClient();
  private logger: Logger;

  constructor() {
    this.logger = createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'redis-service' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      ],
    });
  }

  // Basic Operations
  async get(key: string): Promise<string | null> {
    try {
      const result = await this.client.getClient().get(key);
      this.logger.debug('Redis GET operation', { key, found: !!result });
      return result;
    } catch (error) {
      this.logger.error('Redis GET error', {
        key,
        error: (error as Error).message,
      });
      return null;
    }
  }

  async set(
    key: string,
    value: RedisValue,
    options: SetOptions = {}
  ): Promise<'OK'> {
    try {
      const client = this.client.getClient();
      let result: 'OK';

      if (options.ttl) {
        if (options.nx) {
          result = await client.set(key, value, 'EX', options.ttl, 'NX');
        } else if (options.xx) {
          result = await client.set(key, value, 'EX', options.ttl, 'XX');
        } else {
          result = await client.setex(key, options.ttl, value);
        }
      } else {
        if (options.nx) {
          result = await client.set(key, value, 'NX');
        } else if (options.xx) {
          result = await client.set(key, value, 'XX');
        } else {
          result = await client.set(key, value);
        }
      }

      this.logger.debug('Redis SET operation', { key, ttl: options.ttl });
      return result;
    } catch (error) {
      this.logger.error('Redis SET error', {
        key,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async del(key: string): Promise<number> {
    try {
      const result = await this.client.getClient().del(key);
      this.logger.debug('Redis DEL operation', { key, deleted: result });
      return result;
    } catch (error) {
      this.logger.error('Redis DEL error', {
        key,
        error: (error as Error).message,
      });
      return 0;
    }
  }

  async exists(key: string): Promise<number> {
    try {
      const result = await this.client.getClient().exists(key);
      this.logger.debug('Redis EXISTS operation', { key, exists: !!result });
      return result;
    } catch (error) {
      this.logger.error('Redis EXISTS error', {
        key,
        error: (error as Error).message,
      });
      return 0;
    }
  }

  async expire(key: string, seconds: number): Promise<number> {
    try {
      const result = await this.client.getClient().expire(key, seconds);
      this.logger.debug('Redis EXPIRE operation', {
        key,
        seconds,
        success: !!result,
      });
      return result;
    } catch (error) {
      this.logger.error('Redis EXPIRE error', {
        key,
        error: (error as Error).message,
      });
      return 0;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      const result = await this.client.getClient().ttl(key);
      this.logger.debug('Redis TTL operation', { key, ttl: result });
      return result;
    } catch (error) {
      this.logger.error('Redis TTL error', {
        key,
        error: (error as Error).message,
      });
      return -2; // Key does not exist
    }
  }

  // JSON Operations
  async getJSON<T = any>(key: string): Promise<T | null> {
    try {
      const result = await this.get(key);
      if (!result) return null;

      const parsed = JSON.parse(result) as T;
      this.logger.debug('Redis JSON GET operation', { key, found: true });
      return parsed;
    } catch (error) {
      this.logger.error('Redis JSON GET error', {
        key,
        error: (error as Error).message,
      });
      return null;
    }
  }

  async setJSON<T = any>(
    key: string,
    value: T,
    options: SetOptions = {}
  ): Promise<'OK'> {
    try {
      const serialized = JSON.stringify(value);
      const result = await this.set(key, serialized, options);
      this.logger.debug('Redis JSON SET operation', { key, ttl: options.ttl });
      return result;
    } catch (error) {
      this.logger.error('Redis JSON SET error', {
        key,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Hash Operations
  async hget(key: string, field: string): Promise<string | null> {
    try {
      const result = await this.client.getClient().hget(key, field);
      this.logger.debug('Redis HGET operation', {
        key,
        field,
        found: !!result,
      });
      return result;
    } catch (error) {
      this.logger.error('Redis HGET error', {
        key,
        field,
        error: (error as Error).message,
      });
      return null;
    }
  }

  async hset(key: string, field: string, value: RedisValue): Promise<number> {
    try {
      const result = await this.client.getClient().hset(key, field, value);
      this.logger.debug('Redis HSET operation', {
        key,
        field,
        created: !!result,
      });
      return result;
    } catch (error) {
      this.logger.error('Redis HSET error', {
        key,
        field,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async hdel(key: string, field: string): Promise<number> {
    try {
      const result = await this.client.getClient().hdel(key, field);
      this.logger.debug('Redis HDEL operation', {
        key,
        field,
        deleted: result,
      });
      return result;
    } catch (error) {
      this.logger.error('Redis HDEL error', {
        key,
        field,
        error: (error as Error).message,
      });
      return 0;
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    try {
      const result = await this.client.getClient().hgetall(key);
      this.logger.debug('Redis HGETALL operation', {
        key,
        fieldCount: Object.keys(result).length,
      });
      return result;
    } catch (error) {
      this.logger.error('Redis HGETALL error', {
        key,
        error: (error as Error).message,
      });
      return {};
    }
  }

  // List Operations
  async lpush(key: string, ...values: RedisValue[]): Promise<number> {
    try {
      const result = await this.client.getClient().lpush(key, ...values);
      this.logger.debug('Redis LPUSH operation', {
        key,
        count: values.length,
        newLength: result,
      });
      return result;
    } catch (error) {
      this.logger.error('Redis LPUSH error', {
        key,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async rpush(key: string, ...values: RedisValue[]): Promise<number> {
    try {
      const result = await this.client.getClient().rpush(key, ...values);
      this.logger.debug('Redis RPUSH operation', {
        key,
        count: values.length,
        newLength: result,
      });
      return result;
    } catch (error) {
      this.logger.error('Redis RPUSH error', {
        key,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async lpop(key: string): Promise<string | null> {
    try {
      const result = await this.client.getClient().lpop(key);
      this.logger.debug('Redis LPOP operation', { key, found: !!result });
      return result;
    } catch (error) {
      this.logger.error('Redis LPOP error', {
        key,
        error: (error as Error).message,
      });
      return null;
    }
  }

  async rpop(key: string): Promise<string | null> {
    try {
      const result = await this.client.getClient().rpop(key);
      this.logger.debug('Redis RPOP operation', { key, found: !!result });
      return result;
    } catch (error) {
      this.logger.error('Redis RPOP error', {
        key,
        error: (error as Error).message,
      });
      return null;
    }
  }

  async llen(key: string): Promise<number> {
    try {
      const result = await this.client.getClient().llen(key);
      this.logger.debug('Redis LLEN operation', { key, length: result });
      return result;
    } catch (error) {
      this.logger.error('Redis LLEN error', {
        key,
        error: (error as Error).message,
      });
      return 0;
    }
  }

  // Set Operations
  async sadd(key: string, ...members: RedisValue[]): Promise<number> {
    try {
      const result = await this.client.getClient().sadd(key, ...members);
      this.logger.debug('Redis SADD operation', {
        key,
        count: members.length,
        added: result,
      });
      return result;
    } catch (error) {
      this.logger.error('Redis SADD error', {
        key,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async srem(key: string, ...members: RedisValue[]): Promise<number> {
    try {
      const result = await this.client.getClient().srem(key, ...members);
      this.logger.debug('Redis SREM operation', {
        key,
        count: members.length,
        removed: result,
      });
      return result;
    } catch (error) {
      this.logger.error('Redis SREM error', {
        key,
        error: (error as Error).message,
      });
      return 0;
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      const result = await this.client.getClient().smembers(key);
      this.logger.debug('Redis SMEMBERS operation', {
        key,
        memberCount: result.length,
      });
      return result;
    } catch (error) {
      this.logger.error('Redis SMEMBERS error', {
        key,
        error: (error as Error).message,
      });
      return [];
    }
  }

  async sismember(key: string, member: RedisValue): Promise<number> {
    try {
      const result = await this.client.getClient().sismember(key, member);
      this.logger.debug('Redis SISMEMBER operation', {
        key,
        member,
        isMember: !!result,
      });
      return result;
    } catch (error) {
      this.logger.error('Redis SISMEMBER error', {
        key,
        member,
        error: (error as Error).message,
      });
      return 0;
    }
  }

  // Utility Methods
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.getClient().ping();
      const isHealthy = result === 'PONG';
      this.logger.debug('Redis PING operation', {
        response: result,
        healthy: isHealthy,
      });
      return isHealthy;
    } catch (error) {
      this.logger.error('Redis PING error', {
        error: (error as Error).message,
      });
      return false;
    }
  }

  async flushdb(): Promise<'OK'> {
    try {
      const result = await this.client.getClient().flushdb();
      this.logger.warn('Redis FLUSHDB operation executed');
      return result;
    } catch (error) {
      this.logger.error('Redis FLUSHDB error', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      const result = await this.client.getClient().keys(pattern);
      this.logger.debug('Redis KEYS operation', {
        pattern,
        count: result.length,
      });
      return result;
    } catch (error) {
      this.logger.error('Redis KEYS error', {
        pattern,
        error: (error as Error).message,
      });
      return [];
    }
  }

  // Health and Monitoring
  async getHealthCheck(): Promise<RedisHealthCheck> {
    try {
      const start = Date.now();
      await this.ping();
      const latency = Date.now() - start;

      const info = await this.client.getClient().info();
      const lines = info.split('\r\n');
      const infoObj: Record<string, string> = {};

      lines.forEach((line) => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          infoObj[key] = value;
        }
      });

      return {
        status:
          latency < 1000
            ? 'healthy'
            : latency < 5000
              ? 'degraded'
              : 'unhealthy',
        latency,
        memory: {
          used: infoObj.used_memory_human || '0B',
          peak: infoObj.used_memory_peak_human || '0B',
          fragmentation: parseFloat(infoObj.mem_fragmentation_ratio || '1'),
        },
        connections: parseInt(infoObj.connected_clients || '0', 10),
        uptime: parseInt(infoObj.uptime_in_seconds || '0', 10),
        version: infoObj.redis_version || 'unknown',
      };
    } catch (error) {
      this.logger.error('Redis health check error', {
        error: (error as Error).message,
      });
      return {
        status: 'unhealthy',
        latency: -1,
        memory: { used: '0B', peak: '0B', fragmentation: 0 },
        connections: 0,
        uptime: 0,
        version: 'unknown',
      };
    }
  }

  getConnectionStatus(): RedisConnectionStatus {
    return this.client.getConnectionStatus();
  }

  // Connection Management
  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }
}
