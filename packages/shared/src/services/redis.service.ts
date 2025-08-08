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

/**
 * Redis service implementation providing a comprehensive interface for Redis operations.
 * This service wraps the Redis client with logging, error handling, and provides
 * both basic and advanced Redis operations including JSON support, hash operations,
 * list operations, set operations, and health monitoring.
 *
 * @example
 * ```typescript
 * import { redisService } from './redis.service';
 *
 * // Basic operations
 * await redisService.set('user:123', 'user_data', { ttl: 3600 });
 * const userData = await redisService.get('user:123');
 *
 * // JSON operations
 * const user = { id: 123, name: 'John', email: 'john@example.com' };
 * await redisService.setJSON('user:123', user);
 * const retrievedUser = await redisService.getJSON<typeof user>('user:123');
 *
 * // Hash operations
 * await redisService.hset('user:123', 'name', 'John');
 * const name = await redisService.hget('user:123', 'name');
 *
 * // Health monitoring
 * const health = await redisService.getHealthCheck();
 * console.log(`Redis status: ${health.status}, Latency: ${health.latency}ms`);
 * ```
 */
export class RedisService implements RedisServiceInterface {
  private client = getRedisClient();
  private logger: Logger;

  /**
   * Creates a new Redis service instance with configured logging.
   * The logger is configured with JSON formatting and console transport.
   */
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
  /**
   * Retrieves a value from Redis by key.
   *
   * @param key - The key to retrieve from Redis
   * @returns The value as string or null if key doesn't exist
   *
   * @example
   * ```typescript
   * const value = await redisService.get('user:123');
   * if (value) {
   *   console.log('User data:', value);
   * } else {
   *   console.log('User not found');
   * }
   * ```
   */
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

  /**
   * Sets a value in Redis with optional configuration.
   * Supports TTL (time-to-live), NX (only if not exists), and XX (only if exists) options.
   *
   * @param key - The key to set in Redis
   * @param value - The value to store (string, number, or Buffer)
   * @param options - Optional settings for the operation
   * @returns 'OK' on successful set
   * @throws Error if the operation fails
   *
   * @example
   * ```typescript
   * // Basic set
   * await redisService.set('key', 'value');
   *
   * // Set with TTL (expires in 1 hour)
   * await redisService.set('session:123', 'session_data', { ttl: 3600 });
   *
   * // Set only if key doesn't exist
   * await redisService.set('lock:resource', 'locked', { nx: true });
   *
   * // Set only if key exists with TTL
   * await redisService.set('user:123', 'updated_data', { xx: true, ttl: 1800 });
   * ```
   */
  async set(
    key: string,
    value: RedisValue,
    options: SetOptions = {}
  ): Promise<'OK'> {
    try {
      const client = this.client.getClient();
      let result: 'OK' | null;

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
      if (!result) throw new Error('Failed to set value in Redis');
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

  /**
   * Deletes a key from Redis.
   *
   * @param key - The key to delete from Redis
   * @returns Number of keys deleted (1 if deleted, 0 if key didn't exist)
   *
   * @example
   * ```typescript
   * const deleted = await redisService.del('user:123');
   * if (deleted > 0) {
   *   console.log('User deleted successfully');
   * } else {
   *   console.log('User was not found');
   * }
   * ```
   */
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

  /**
   * Checks if a key exists in Redis.
   *
   * @param key - The key to check for existence
   * @returns 1 if key exists, 0 if it doesn't
   *
   * @example
   * ```typescript
   * const exists = await redisService.exists('user:123');
   * if (exists) {
   *   console.log('User exists in Redis');
   * } else {
   *   console.log('User not found in Redis');
   * }
   * ```
   */
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

  /**
   * Sets an expiration time for a key.
   *
   * @param key - The key to set expiration for
   * @param seconds - Time to live in seconds
   * @returns 1 if timeout was set, 0 if key doesn't exist
   *
   * @example
   * ```typescript
   * const success = await redisService.expire('session:123', 3600);
   * if (success) {
   *   console.log('Session will expire in 1 hour');
   * } else {
   *   console.log('Session not found');
   * }
   * ```
   */
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

  /**
   * Gets the remaining time to live for a key.
   *
   * @param key - The key to check TTL for
   * @returns TTL in seconds, -1 if no expiration, -2 if key doesn't exist
   *
   * @example
   * ```typescript
   * const ttl = await redisService.ttl('session:123');
   * if (ttl > 0) {
   *   console.log(`Session expires in ${ttl} seconds`);
   * } else if (ttl === -1) {
   *   console.log('Session has no expiration');
   * } else {
   *   console.log('Session not found');
   * }
   * ```
   */
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
  /**
   * Retrieves and parses a JSON value from Redis.
   *
   * @param key - The key to retrieve from Redis
   * @returns Parsed JSON object or null if key doesn't exist or invalid JSON
   *
   * @example
   * ```typescript
   * interface User {
   *   id: number;
   *   name: string;
   *   email: string;
   * }
   *
   * const user = await redisService.getJSON<User>('user:123');
   * if (user) {
   *   console.log(`User: ${user.name} (${user.email})`);
   * } else {
   *   console.log('User not found or invalid JSON');
   * }
   * ```
   */
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

  /**
   * Serializes and stores a JSON object in Redis.
   *
   * @param key - The key to store under
   * @param value - The JSON object to serialize and store
   * @param options - Optional settings for the operation
   * @returns 'OK' on successful set
   * @throws Error if the operation fails
   *
   * @example
   * ```typescript
   * const user = {
   *   id: 123,
   *   name: 'John',
   *   email: 'john@example.com',
   *   createdAt: new Date()
   * };
   *
   * await redisService.setJSON('user:123', user, { ttl: 3600 });
   * console.log('User stored as JSON with 1 hour TTL');
   * ```
   */
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
  /**
   * Gets a field value from a Redis hash.
   *
   * @param key - The hash key
   * @param field - The field name to retrieve
   * @returns The field value or null if field doesn't exist
   *
   * @example
   * ```typescript
   * const name = await redisService.hget('user:123', 'name');
   * const email = await redisService.hget('user:123', 'email');
   *
   * if (name && email) {
   *   console.log(`User: ${name} (${email})`);
   * }
   * ```
   */
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

  /**
   * Sets a field value in a Redis hash.
   *
   * @param key - The hash key
   * @param field - The field name to set
   * @param value - The value to store
   * @returns Number of fields that were added (1 for new field, 0 for existing field update)
   * @throws Error if the operation fails
   *
   * @example
   * ```typescript
   * await redisService.hset('user:123', 'name', 'John');
   * await redisService.hset('user:123', 'email', 'john@example.com');
   * await redisService.hset('user:123', 'age', '30');
   *
   * console.log('User hash fields set successfully');
   * ```
   */
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

  /**
   * Deletes a field from a Redis hash.
   *
   * @param key - The hash key
   * @param field - The field name to delete
   * @returns Number of fields deleted (1 if deleted, 0 if field didn't exist)
   *
   * @example
   * ```typescript
   * const deleted = await redisService.hdel('user:123', 'email');
   * if (deleted > 0) {
   *   console.log('Email field deleted from user hash');
   * } else {
   *   console.log('Email field was not found');
   * }
   * ```
   */
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

  /**
   * Gets all fields and values from a Redis hash.
   *
   * @param key - The hash key
   * @returns Object with field-value pairs, empty object if hash doesn't exist
   *
   * @example
   * ```typescript
   * const userData = await redisService.hgetall('user:123');
   * console.log('User data:', userData);
   * // Output: { name: 'John', email: 'john@example.com', age: '30' }
   *
   * if (Object.keys(userData).length > 0) {
   *   console.log(`User has ${Object.keys(userData).length} fields`);
   * } else {
   *   console.log('User hash is empty or doesn\'t exist');
   * }
   * ```
   */
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
  /**
   * Pushes values to the left (head) of a Redis list.
   *
   * @param key - The list key
   * @param values - Values to push to the left of the list
   * @returns Length of the list after push operation
   * @throws Error if the operation fails
   *
   * @example
   * ```typescript
   * // Add items to the front of a queue
   * await redisService.lpush('queue:emails', 'high_priority@example.com');
   * await redisService.lpush('queue:emails', 'urgent@example.com', 'critical@example.com');
   *
   * const length = await redisService.llen('queue:emails');
   * console.log(`Queue now has ${length} emails`);
   * ```
   */
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

  /**
   * Pushes values to the right (tail) of a Redis list.
   *
   * @param key - The list key
   * @param values - Values to push to the right of the list
   * @returns Length of the list after push operation
   * @throws Error if the operation fails
   *
   * @example
   * ```typescript
   * // Add items to the end of a queue
   * await redisService.rpush('queue:emails', 'normal@example.com');
   * await redisService.rpush('queue:emails', 'low_priority@example.com', 'newsletter@example.com');
   *
   * const length = await redisService.llen('queue:emails');
   * console.log(`Queue now has ${length} emails`);
   * ```
   */
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

  /**
   * Pops and returns the leftmost (head) element from a Redis list.
   *
   * @param key - The list key
   * @returns The popped value or null if list is empty
   *
   * @example
   * ```typescript
   * // Process items from the front of a queue
   * const email = await redisService.lpop('queue:emails');
   * if (email) {
   *   console.log('Processing email:', email);
   *   // Process the email...
   * } else {
   *   console.log('No emails in queue');
   * }
   * ```
   */
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

  /**
   * Pops and returns the rightmost (tail) element from a Redis list.
   *
   * @param key - The list key
   * @returns The popped value or null if list is empty
   *
   * @example
   * ```typescript
   * // Process items from the end of a queue
   * const email = await redisService.rpop('queue:emails');
   * if (email) {
   *   console.log('Processing email from end:', email);
   *   // Process the email...
   * } else {
   *   console.log('No emails in queue');
   * }
   * ```
   */
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

  /**
   * Gets the length of a Redis list.
   *
   * @param key - The list key
   * @returns Number of elements in the list, 0 if list doesn't exist
   *
   * @example
   * ```typescript
   * const length = await redisService.llen('queue:emails');
   * console.log(`Queue has ${length} pending emails`);
   *
   * if (length > 100) {
   *   console.log('Queue is getting long, consider scaling up processors');
   * }
   * ```
   */
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
  /**
   * Adds members to a Redis set.
   *
   * @param key - The set key
   * @param members - Members to add to the set
   * @returns Number of members that were added (duplicates are ignored)
   * @throws Error if the operation fails
   *
   * @example
   * ```typescript
   * // Add users to online set
   * await redisService.sadd('online:users', 'user1', 'user2', 'user3');
   *
   * // Add tags to a post
   * await redisService.sadd('post:123:tags', 'javascript', 'redis', 'typescript');
   *
   * // Add unique categories
   * const added = await redisService.sadd('categories', 'tech', 'news', 'sports');
   * console.log(`Added ${added} new categories`);
   * ```
   */
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

  /**
   * Removes members from a Redis set.
   *
   * @param key - The set key
   * @param members - Members to remove from the set
   * @returns Number of members that were removed
   *
   * @example
   * ```typescript
   * // Remove users from online set
   * const removed = await redisService.srem('online:users', 'user1', 'user2');
   * console.log(`Removed ${removed} users from online list`);
   *
   * // Remove tags from a post
   * await redisService.srem('post:123:tags', 'javascript');
   * ```
   */
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

  /**
   * Gets all members of a Redis set.
   *
   * @param key - The set key
   * @returns Array of all members, empty array if set doesn't exist
   *
   * @example
   * ```typescript
   * // Get all online users
   * const onlineUsers = await redisService.smembers('online:users');
   * console.log('Online users:', onlineUsers);
   * console.log(`There are ${onlineUsers.length} users online`);
   *
   * // Get all tags for a post
   * const tags = await redisService.smembers('post:123:tags');
   * console.log('Post tags:', tags);
   * ```
   */
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

  /**
   * Checks if a member exists in a Redis set.
   *
   * @param key - The set key
   * @param member - The member to check for
   * @returns 1 if member exists, 0 if not
   *
   * @example
   * ```typescript
   * // Check if user is online
   * const isOnline = await redisService.sismember('online:users', 'user1');
   * if (isOnline) {
   *   console.log('User is online');
   * } else {
   *   console.log('User is offline');
   * }
   *
   * // Check if post has a specific tag
   * const hasTag = await redisService.sismember('post:123:tags', 'javascript');
   * if (hasTag) {
   *   console.log('Post has JavaScript tag');
   * }
   * ```
   */
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
  /**
   * Pings the Redis server to check connectivity.
   *
   * @returns true if Redis responds with 'PONG', false otherwise
   *
   * @example
   * ```typescript
   * const isAlive = await redisService.ping();
   * if (isAlive) {
   *   console.log('Redis is responding');
   * } else {
   *   console.log('Redis is not responding');
   *   // Handle connection issues...
   * }
   * ```
   */
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

  /**
   * Clears all keys from the current database.
   * ⚠️ Use with extreme caution - this deletes ALL data!
   *
   * @returns 'OK' on success
   * @throws Error if the operation fails
   *
   * @example
   * ```typescript
   * // Only use in development or testing environments
   * if (process.env.NODE_ENV === 'test') {
   *   await redisService.flushdb();
   *   console.log('Test database cleared');
   * }
   * ```
   */
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

  /**
   * Gets keys matching a pattern.
   * ⚠️ Use with caution in production - can be slow on large datasets.
   *
   * @param pattern - Glob pattern (e.g., 'user:*', 'session:*', 'post:*')
   * @returns Array of matching keys
   *
   * @example
   * ```typescript
   * // Get all user keys
   * const userKeys = await redisService.keys('user:*');
   * console.log(`Found ${userKeys.length} user keys`);
   *
   * // Get all session keys
   * const sessionKeys = await redisService.keys('session:*');
   * console.log(`Found ${sessionKeys.length} session keys`);
   *
   * // Get keys with specific pattern
   * const postKeys = await redisService.keys('post:123:*');
   * console.log('Post-related keys:', postKeys);
   * ```
   */
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
  /**
   * Performs a comprehensive health check of the Redis instance.
   * Includes latency measurement, memory usage, connection count, and server info.
   *
   * @returns Detailed health information including status, latency, memory usage
   *
   * @example
   * ```typescript
   * const health = await redisService.getHealthCheck();
   *
   * console.log(`Redis Status: ${health.status}`);
   * console.log(`Latency: ${health.latency}ms`);
   * console.log(`Memory Used: ${health.memory.used}`);
   * console.log(`Memory Peak: ${health.memory.peak}`);
   * console.log(`Fragmentation: ${(health.memory.fragmentation * 100).toFixed(1)}%`);
   * console.log(`Active Connections: ${health.connections}`);
   * console.log(`Uptime: ${Math.floor(health.uptime / 3600)} hours`);
   * console.log(`Version: ${health.version}`);
   *
   * // Use health status for monitoring
   * if (health.status === 'unhealthy') {
   *   // Alert or take corrective action
   *   console.error('Redis is unhealthy!');
   * } else if (health.status === 'degraded') {
   *   console.warn('Redis performance is degraded');
   * }
   * ```
   */
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

  /**
   * Gets the current connection status information.
   *
   * @returns Connection status including connected, ready, reconnecting states
   *
   * @example
   * ```typescript
   * const status = redisService.getConnectionStatus();
   *
   * console.log(`Connected: ${status.connected}`);
   * console.log(`Ready: ${status.ready}`);
   * console.log(`Reconnecting: ${status.reconnecting}`);
   * console.log(`Connection Count: ${status.connectionCount}`);
   *
   * if (status.lastError) {
   *   console.log(`Last Error: ${status.lastError.message}`);
   * }
   *
   * if (!status.connected) {
   *   console.log('Redis is disconnected');
   *   // Handle disconnection...
   * }
   * ```
   */
  getConnectionStatus(): RedisConnectionStatus {
    return this.client.getConnectionStatus();
  }

  // Connection Management
  /**
   * Force disconnects from Redis immediately.
   *
   * @returns Promise that resolves when disconnected
   *
   * @example
   * ```typescript
   * await redisService.disconnect();
   * console.log('Redis disconnected');
   *
   * // Reconnect later if needed
   * // The service will automatically reconnect on next operation
   * ```
   */
  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  /**
   * Gracefully quits the Redis connection.
   *
   * @returns 'OK' on success
   * @throws Error if the operation fails
   *
   * @example
   * ```typescript
   * try {
   *   await redisService.quit();
   *   console.log('Redis connection closed gracefully');
   * } catch (error) {
   *   console.error('Failed to quit Redis:', error);
   * }
   * ```
   */
  async quit(): Promise<'OK'> {
    try {
      const result = await this.client.getClient().quit();
      this.logger.info('Redis client quit successfully');
      return result;
    } catch (error) {
      this.logger.error('Redis QUIT error', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

/**
 * Singleton instance of the Redis service.
 * Provides a single, shared instance across the application.
 *
 * @example
 * ```typescript
 * import { redisService } from './redis.service';
 *
 * // Use the singleton instance
 * await redisService.set('key', 'value');
 * const value = await redisService.get('key');
 * ```
 */
let redisServiceInstance: RedisService | null = null;

/**
 * Gets or creates the singleton Redis service instance.
 *
 * @returns The singleton Redis service instance
 *
 * @example
 * ```typescript
 * import { getRedisService } from './redis.service';
 *
 * const redisService = getRedisService();
 * await redisService.set('key', 'value');
 * ```
 */
export const getRedisService = (): RedisService => {
  if (!redisServiceInstance) {
    redisServiceInstance = new RedisService();
  }
  return redisServiceInstance;
};

/**
 * Pre-configured singleton instance of the Redis service.
 * Use this for direct access to the Redis service without calling getRedisService().
 *
 * @example
 * ```typescript
 * import { redisService } from './redis.service';
 *
 * // Direct usage
 * await redisService.set('user:123', 'user_data');
 * const userData = await redisService.get('user:123');
 *
 * // Health check
 * const health = await redisService.getHealthCheck();
 * console.log(`Redis status: ${health.status}`);
 * ```
 */
export const redisService = getRedisService();
