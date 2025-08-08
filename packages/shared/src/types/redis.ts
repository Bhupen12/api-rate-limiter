/**
 * Redis configuration Examples
 *
 * host: 'localhost', // Redis server host
 * port: 6379, // Redis server port
 * password: 'your_password', // Optional password for Redis server
 * db: 0, // Database index to use
 */

/**
 * Configuration interface for Redis client connection and behavior settings.
 *
 * @example
 * ```typescript
 * const redisConfig: RedisConfig = {
 *   host: 'localhost',
 *   port: 6379,
 *   password: 'your_redis_password', // Optional
 *   db: 0,
 *   keyPrefix: 'app:',
 *   maxRetriesPerRequest: 3,
 *   retryDelayOnFailover: 100,
 *   enableReadyCheck: true,
 *   lazyConnect: false,
 *   keepAlive: 30000,
 *   family: 4, // IPv4
 *   connectTimeout: 10000,
 *   commandTimeout: 5000,
 *   maxmemoryPolicy: 'allkeys-lru' // Optional
 * };
 *
 * // For production with Redis Cloud
 * const productionConfig: RedisConfig = {
 *   host: 'redis-12345.c123.us-east-1-1.ec2.cloud.redislabs.com',
 *   port: 12345,
 *   password: 'your_cloud_password',
 *   db: 0,
 *   keyPrefix: 'prod:',
 *   maxRetriesPerRequest: 5,
 *   retryDelayOnFailover: 200,
 *   enableReadyCheck: true,
 *   lazyConnect: true,
 *   keepAlive: 60000,
 *   family: 4,
 *   connectTimeout: 15000,
 *   commandTimeout: 10000,
 *   maxmemoryPolicy: 'volatile-lru'
 * };
 * ```
 */
export interface RedisConfig {
  /** Redis server hostname or IP address */
  host: string;
  /** Redis server port number (default: 6379) */
  port: number;
  /** Optional password for Redis authentication */
  password?: string;
  /** Database index to use (0-15, default: 0) */
  db: number;
  /** Prefix to add to all keys (e.g., 'app:' makes 'user:123' become 'app:user:123') */
  keyPrefix: string;
  /** Maximum number of retries per request before failing */
  maxRetriesPerRequest: number;
  /** Delay in milliseconds between retry attempts on failover */
  retryDelayOnFailover: number;
  /** Whether to enable ready check to ensure Redis is ready to accept commands */
  enableReadyCheck: boolean;
  /** Whether to connect lazily (only when first command is sent) */
  lazyConnect: boolean;
  /** Keep-alive timeout in milliseconds for TCP connections */
  keepAlive: number;
  /** IP version family (4 for IPv4, 6 for IPv6) */
  family: number;
  /** Connection timeout in milliseconds */
  connectTimeout: number;
  /** Command timeout in milliseconds */
  commandTimeout: number;
  /** Optional Redis memory policy for eviction (e.g., 'allkeys-lru', 'volatile-lru') */
  maxmemoryPolicy?: string;
}

/**
 * Configuration interface for Redis Cluster connection settings.
 * Used when connecting to a Redis Cluster with multiple nodes.
 *
 * @example
 * ```typescript
 * const clusterConfig: RedisClusterConfig = {
 *   nodes: [
 *     { host: 'redis-node-1.example.com', port: 7000 },
 *     { host: 'redis-node-2.example.com', port: 7000 },
 *     { host: 'redis-node-3.example.com', port: 7000 }
 *   ],
 *   password: 'cluster_password', // Optional cluster password
 *   keyPrefix: 'cluster:',
 *   maxRetriesPerRequest: 3,
 *   retryDelayOnFailover: 100,
 *   enableReadyCheck: true,
 *   redisOptions: {
 *     password: 'node_password', // Optional individual node password
 *     db: 0
 *   }
 * };
 *
 * // For local Redis Cluster development
 * const localClusterConfig: RedisClusterConfig = {
 *   nodes: [
 *     { host: 'localhost', port: 7000 },
 *     { host: 'localhost', port: 7001 },
 *     { host: 'localhost', port: 7002 }
 *   ],
 *   keyPrefix: 'dev:',
 *   maxRetriesPerRequest: 2,
 *   retryDelayOnFailover: 50,
 *   enableReadyCheck: true,
 *   redisOptions: {
 *     db: 0
 *   }
 * };
 * ```
 */
export interface RedisClusterConfig {
  /** Array of Redis cluster node configurations */
  nodes: Array<{ host: string; port: number }>;
  /** Optional password for cluster authentication */
  password?: string;
  /** Prefix to add to all keys in the cluster */
  keyPrefix: string;
  /** Maximum number of retries per request before failing */
  maxRetriesPerRequest: number;
  /** Delay in milliseconds between retry attempts on failover */
  retryDelayOnFailover: number;
  /** Whether to enable ready check to ensure cluster is ready */
  enableReadyCheck: boolean;
  /** Redis options for individual nodes */
  redisOptions: {
    /** Optional password for individual node authentication */
    password?: string;
    /** Database index to use (0-15, default: 0) */
    db: number;
  };
}

/**
 * Options for Redis SET command operations.
 *
 * @example
 * ```typescript
 * // Set with TTL (expires in 1 hour)
 * const ttlOptions: SetOptions = {
 *   ttl: 3600 // 1 hour in seconds
 * };
 *
 * // Set only if key doesn't exist (NX = Not eXists)
 * const nxOptions: SetOptions = {
 *   nx: true
 * };
 *
 * // Set only if key exists (XX = eXists)
 * const xxOptions: SetOptions = {
 *   xx: true
 * };
 *
 * // Set with TTL and only if key doesn't exist
 * const combinedOptions: SetOptions = {
 *   ttl: 1800, // 30 minutes
 *   nx: true
 * };
 *
 * // Usage with Redis service
 * await redisService.set('user:123', 'user_data', ttlOptions);
 * await redisService.set('lock:resource', 'locked', nxOptions);
 * ```
 */
export interface SetOptions {
  /** Time to live in seconds - key will be automatically deleted after this time */
  ttl?: number;
  /** Only set if key doesn't exist (NX = Not eXists) */
  nx?: boolean;
  /** Only set if key exists (XX = eXists) */
  xx?: boolean;
}

/**
 * Health check information for Redis instance.
 *
 * @example
 * ```typescript
 * const healthCheck: RedisHealthCheck = {
 *   status: 'healthy',
 *   latency: 2.5, // milliseconds
 *   memory: {
 *     used: '1.2GB',
 *     peak: '1.5GB',
 *     fragmentation: 0.15 // 15% fragmentation
 *   },
 *   connections: 25,
 *   uptime: 86400, // seconds (24 hours)
 *   version: '6.2.6'
 * };
 *
 * // Usage with Redis service
 * const health = await redisService.getHealthCheck();
 * if (health.status === 'healthy') {
 *   console.log(`Redis is healthy with ${health.latency}ms latency`);
 * } else {
 *   console.log(`Redis is ${health.status} - check memory usage: ${health.memory.used}`);
 * }
 * ```
 */
export interface RedisHealthCheck {
  /** Current health status of the Redis instance */
  status: 'healthy' | 'unhealthy' | 'degraded';
  /** Response latency in milliseconds */
  latency: number;
  /** Memory usage information */
  memory: {
    /** Currently used memory */
    used: string;
    /** Peak memory usage */
    peak: string;
    /** Memory fragmentation ratio (0-1) */
    fragmentation: number;
  };
  /** Number of active connections */
  connections: number;
  /** Server uptime in seconds */
  uptime: number;
  /** Redis server version */
  version: string;
}

/**
 * Current connection status information for Redis client.
 *
 * @example
 * ```typescript
 * const connectionStatus: RedisConnectionStatus = {
 *   connected: true,
 *   ready: true,
 *   reconnecting: false,
 *   lastError: undefined,
 *   connectionCount: 1
 * };
 *
 * // Usage with Redis service
 * const status = redisService.getConnectionStatus();
 * if (!status.connected) {
 *   console.log('Redis disconnected, attempting to reconnect...');
 *   console.log('Last error:', status.lastError?.message);
 * }
 *
 * if (status.reconnecting) {
 *   console.log('Redis is currently reconnecting...');
 * }
 * ```
 */
export interface RedisConnectionStatus {
  /** Whether the client is currently connected to Redis */
  connected: boolean;
  /** Whether the client is ready to accept commands */
  ready: boolean;
  /** Whether the client is currently attempting to reconnect */
  reconnecting: boolean;
  /** Last error that occurred during connection/operation */
  lastError?: Error;
  /** Number of connection attempts made */
  connectionCount: number;
}

/**
 * Valid value types that can be stored in Redis.
 *
 * @example
 * ```typescript
 * // String values
 * const stringValue: RedisValue = 'hello world';
 *
 * // Numeric values
 * const numberValue: RedisValue = 42;
 * const floatValue: RedisValue = 3.14159;
 *
 * // Buffer values (for binary data)
 * const bufferValue: RedisValue = Buffer.from('binary data');
 *
 * // Usage with Redis service
 * await redisService.set('string:key', stringValue);
 * await redisService.set('number:key', numberValue);
 * await redisService.set('binary:key', bufferValue);
 * ```
 */
export type RedisValue = string | number | Buffer;

/**
 * Interface defining all Redis operations available through the Redis service.
 * Provides a comprehensive API for interacting with Redis including basic operations,
 * JSON operations, hash operations, list operations, set operations, and utility methods.
 *
 * @example
 * ```typescript
 * // Basic operations
 * await redisService.set('user:123', 'user_data', { ttl: 3600 });
 * const userData = await redisService.get('user:123');
 * const exists = await redisService.exists('user:123');
 * await redisService.expire('user:123', 7200); // Extend TTL to 2 hours
 * const ttl = await redisService.ttl('user:123');
 * await redisService.del('user:123');
 *
 * // JSON operations
 * const user = { id: 123, name: 'John', email: 'john@example.com' };
 * await redisService.setJSON('user:123', user, { ttl: 3600 });
 * const retrievedUser = await redisService.getJSON<typeof user>('user:123');
 *
 * // Hash operations
 * await redisService.hset('user:123', 'name', 'John');
 * await redisService.hset('user:123', 'email', 'john@example.com');
 * const name = await redisService.hget('user:123', 'name');
 * const allFields = await redisService.hgetall('user:123');
 * await redisService.hdel('user:123', 'email');
 *
 * // List operations
 * await redisService.lpush('queue:emails', 'email1@example.com');
 * await redisService.rpush('queue:emails', 'email2@example.com');
 * const email = await redisService.lpop('queue:emails');
 * const queueLength = await redisService.llen('queue:emails');
 *
 * // Set operations
 * await redisService.sadd('online:users', 'user1', 'user2', 'user3');
 * const isOnline = await redisService.sismember('online:users', 'user1');
 * const onlineUsers = await redisService.smembers('online:users');
 * await redisService.srem('online:users', 'user1');
 *
 * // Utility methods
 * const isAlive = await redisService.ping();
 * const keys = await redisService.keys('user:*');
 * await redisService.flushdb(); // Clear all data (use with caution!)
 *
 * // Health and monitoring
 * const health = await redisService.getHealthCheck();
 * const status = redisService.getConnectionStatus();
 *
 * // Connection management
 * await redisService.quit(); // Graceful shutdown
 * // or
 * await redisService.disconnect(); // Force disconnect
 * ```
 */
export interface RedisServiceInterface {
  // Basic operations
  /**
   * Get a value from Redis by key
   * @param key - The key to retrieve
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
  get(key: string): Promise<string | null>;

  /**
   * Set a value in Redis with optional settings
   * @param key - The key to set
   * @param value - The value to store
   * @param options - Optional settings like TTL, NX, XX
   * @returns 'OK' on success
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
   * ```
   */
  set(key: string, value: RedisValue, options?: SetOptions): Promise<'OK'>;

  /**
   * Delete one or more keys from Redis
   * @param key - The key to delete
   * @returns Number of keys deleted
   *
   * @example
   * ```typescript
   * const deleted = await redisService.del('user:123');
   * console.log(`Deleted ${deleted} key(s)`);
   * ```
   */
  del(key: string): Promise<number>;

  /**
   * Check if a key exists in Redis
   * @param key - The key to check
   * @returns 1 if key exists, 0 if not
   *
   * @example
   * ```typescript
   * const exists = await redisService.exists('user:123');
   * if (exists) {
   *   console.log('User exists');
   * }
   * ```
   */
  exists(key: string): Promise<number>;

  /**
   * Set expiration time for a key
   * @param key - The key to set expiration for
   * @param seconds - Time to live in seconds
   * @returns 1 if timeout was set, 0 if key doesn't exist
   *
   * @example
   * ```typescript
   * await redisService.expire('session:123', 3600); // Expire in 1 hour
   * ```
   */
  expire(key: string, seconds: number): Promise<number>;

  /**
   * Get remaining time to live for a key
   * @param key - The key to check
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
  ttl(key: string): Promise<number>;

  // JSON operations
  /**
   * Get a JSON value from Redis and parse it
   * @param key - The key to retrieve
   * @returns Parsed JSON object or null if key doesn't exist
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
   * }
   * ```
   */
  getJSON<T = any>(key: string): Promise<T | null>;

  /**
   * Store a JSON object in Redis
   * @param key - The key to store under
   * @param value - The JSON object to store
   * @param options - Optional settings like TTL, NX, XX
   * @returns 'OK' on success
   *
   * @example
   * ```typescript
   * const user = { id: 123, name: 'John', email: 'john@example.com' };
   * await redisService.setJSON('user:123', user, { ttl: 3600 });
   * ```
   */
  setJSON<T = any>(key: string, value: T, options?: SetOptions): Promise<'OK'>;

  // Hash operations
  /**
   * Get a field value from a Redis hash
   * @param key - The hash key
   * @param field - The field name
   * @returns The field value or null if field doesn't exist
   *
   * @example
   * ```typescript
   * const name = await redisService.hget('user:123', 'name');
   * console.log('User name:', name);
   * ```
   */
  hget(key: string, field: string): Promise<string | null>;

  /**
   * Set a field value in a Redis hash
   * @param key - The hash key
   * @param field - The field name
   * @param value - The value to set
   * @returns Number of fields that were added
   *
   * @example
   * ```typescript
   * await redisService.hset('user:123', 'name', 'John');
   * await redisService.hset('user:123', 'email', 'john@example.com');
   * ```
   */
  hset(key: string, field: string, value: RedisValue): Promise<number>;

  /**
   * Delete a field from a Redis hash
   * @param key - The hash key
   * @param field - The field name to delete
   * @returns Number of fields deleted
   *
   * @example
   * ```typescript
   * const deleted = await redisService.hdel('user:123', 'email');
   * console.log(`Deleted ${deleted} field(s)`);
   * ```
   */
  hdel(key: string, field: string): Promise<number>;

  /**
   * Get all fields and values from a Redis hash
   * @param key - The hash key
   * @returns Object with field-value pairs
   *
   * @example
   * ```typescript
   * const userData = await redisService.hgetall('user:123');
   * console.log('User data:', userData);
   * // Output: { name: 'John', email: 'john@example.com', age: '30' }
   * ```
   */
  hgetall(key: string): Promise<Record<string, string>>;

  // List operations
  /**
   * Push values to the left (head) of a Redis list
   * @param key - The list key
   * @param values - Values to push
   * @returns Length of the list after push
   *
   * @example
   * ```typescript
   * await redisService.lpush('queue:emails', 'email1@example.com', 'email2@example.com');
   * const length = await redisService.llen('queue:emails');
   * console.log(`Queue has ${length} emails`);
   * ```
   */
  lpush(key: string, ...values: RedisValue[]): Promise<number>;

  /**
   * Push values to the right (tail) of a Redis list
   * @param key - The list key
   * @param values - Values to push
   * @returns Length of the list after push
   *
   * @example
   * ```typescript
   * await redisService.rpush('queue:emails', 'email3@example.com');
   * ```
   */
  rpush(key: string, ...values: RedisValue[]): Promise<number>;

  /**
   * Pop and return the leftmost (head) element from a Redis list
   * @param key - The list key
   * @returns The popped value or null if list is empty
   *
   * @example
   * ```typescript
   * const email = await redisService.lpop('queue:emails');
   * if (email) {
   *   console.log('Processing email:', email);
   * }
   * ```
   */
  lpop(key: string): Promise<string | null>;

  /**
   * Pop and return the rightmost (tail) element from a Redis list
   * @param key - The list key
   * @returns The popped value or null if list is empty
   *
   * @example
   * ```typescript
   * const email = await redisService.rpop('queue:emails');
   * ```
   */
  rpop(key: string): Promise<string | null>;

  /**
   * Get the length of a Redis list
   * @param key - The list key
   * @returns Number of elements in the list
   *
   * @example
   * ```typescript
   * const length = await redisService.llen('queue:emails');
   * console.log(`Queue has ${length} pending emails`);
   * ```
   */
  llen(key: string): Promise<number>;

  // Set operations
  /**
   * Add members to a Redis set
   * @param key - The set key
   * @param members - Members to add
   * @returns Number of members added
   *
   * @example
   * ```typescript
   * await redisService.sadd('online:users', 'user1', 'user2', 'user3');
   * ```
   */
  sadd(key: string, ...members: RedisValue[]): Promise<number>;

  /**
   * Remove members from a Redis set
   * @param key - The set key
   * @param members - Members to remove
   * @returns Number of members removed
   *
   * @example
   * ```typescript
   * const removed = await redisService.srem('online:users', 'user1');
   * console.log(`Removed ${removed} user(s) from online list`);
   * ```
   */
  srem(key: string, ...members: RedisValue[]): Promise<number>;

  /**
   * Get all members of a Redis set
   * @param key - The set key
   * @returns Array of all members
   *
   * @example
   * ```typescript
   * const onlineUsers = await redisService.smembers('online:users');
   * console.log('Online users:', onlineUsers);
   * ```
   */
  smembers(key: string): Promise<string[]>;

  /**
   * Check if a member exists in a Redis set
   * @param key - The set key
   * @param member - The member to check
   * @returns 1 if member exists, 0 if not
   *
   * @example
   * ```typescript
   * const isOnline = await redisService.sismember('online:users', 'user1');
   * if (isOnline) {
   *   console.log('User is online');
   * }
   * ```
   */
  sismember(key: string, member: RedisValue): Promise<number>;

  // Utility methods
  /**
   * Ping Redis server to check connectivity
   * @returns true if Redis responds, false otherwise
   *
   * @example
   * ```typescript
   * const isAlive = await redisService.ping();
   * if (!isAlive) {
   *   console.log('Redis is not responding');
   * }
   * ```
   */
  ping(): Promise<boolean>;

  /**
   * Clear all keys from the current database
   * @returns 'OK' on success
   *
   * @example
   * ```typescript
   * // Use with caution - this deletes ALL data!
   * await redisService.flushdb();
   * console.log('Database cleared');
   * ```
   */
  flushdb(): Promise<'OK'>;

  /**
   * Get keys matching a pattern
   * @param pattern - Glob pattern (e.g., 'user:*', 'session:*')
   * @returns Array of matching keys
   *
   * @example
   * ```typescript
   * const userKeys = await redisService.keys('user:*');
   * console.log('User keys:', userKeys);
   *
   * const sessionKeys = await redisService.keys('session:*');
   * console.log('Session keys:', sessionKeys);
   * ```
   */
  keys(pattern: string): Promise<string[]>;

  // Health and monitoring
  /**
   * Get comprehensive health information about Redis
   * @returns Health check data including status, latency, memory usage
   *
   * @example
   * ```typescript
   * const health = await redisService.getHealthCheck();
   * console.log(`Redis status: ${health.status}`);
   * console.log(`Latency: ${health.latency}ms`);
   * console.log(`Memory used: ${health.memory.used}`);
   * ```
   */
  getHealthCheck(): Promise<RedisHealthCheck>;

  /**
   * Get current connection status information
   * @returns Connection status including connected, ready, reconnecting states
   *
   * @example
   * ```typescript
   * const status = redisService.getConnectionStatus();
   * if (!status.connected) {
   *   console.log('Redis disconnected');
   *   if (status.lastError) {
   *     console.log('Last error:', status.lastError.message);
   *   }
   * }
   * ```
   */
  getConnectionStatus(): RedisConnectionStatus;

  // Connection management
  /**
   * Force disconnect from Redis (immediate)
   * @returns Promise that resolves when disconnected
   *
   * @example
   * ```typescript
   * await redisService.disconnect();
   * console.log('Redis disconnected');
   * ```
   */
  disconnect(): Promise<void>;

  /**
   * Gracefully quit Redis connection
   * @returns 'OK' on success
   *
   * @example
   * ```typescript
   * await redisService.quit();
   * console.log('Redis connection closed gracefully');
   * ```
   */
  quit(): Promise<'OK'>;
}
