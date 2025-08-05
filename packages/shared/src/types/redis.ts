export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  maxRetriesPerRequest: number;
  retryDelayOnFailover: number;
  enableReadyCheck: boolean;
  lazyConnect: boolean;
  keepAlive: number;
  family: number;
  connectTimeout: number;
  commandTimeout: number;
  maxmemoryPolicy?: string;
}

export interface RedisClusterConfig {
  nodes: Array<{ host: string; port: number }>;
  password?: string;
  keyPrefix: string;
  maxRetriesPerRequest: number;
  retryDelayOnFailover: number;
  enableReadyCheck: boolean;
  redisOptions: {
    password?: string;
    db: number;
  };
}

export interface SetOptions {
  ttl?: number; // Time to live in seconds
  nx?: boolean; // Only set if key doesn't exist
  xx?: boolean; // Only set if key exists
}

export interface RedisHealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  latency: number;
  memory: {
    used: string;
    peak: string;
    fragmentation: number;
  };
  connections: number;
  uptime: number;
  version: string;
}

export interface RedisConnectionStatus {
  connected: boolean;
  ready: boolean;
  reconnecting: boolean;
  lastError?: Error;
  connectionCount: number;
}

export type RedisValue = string | number | Buffer;

export interface RedisServiceInterface {
  // Basic operations
  get(key: string): Promise<string | null>;
  set(key: string, value: RedisValue, options?: SetOptions): Promise<'OK'>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;

  // JSON operations
  getJSON<T = any>(key: string): Promise<T | null>;
  setJSON<T = any>(key: string, value: T, options?: SetOptions): Promise<'OK'>;

  // Hash operations
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, field: string, value: RedisValue): Promise<number>;
  hdel(key: string, field: string): Promise<number>;
  hgetall(key: string): Promise<Record<string, string>>;

  // List operations
  lpush(key: string, ...values: RedisValue[]): Promise<number>;
  rpush(key: string, ...values: RedisValue[]): Promise<number>;
  lpop(key: string): Promise<string | null>;
  rpop(key: string): Promise<string | null>;
  llen(key: string): Promise<number>;

  // Set operations
  sadd(key: string, ...members: RedisValue[]): Promise<number>;
  srem(key: string, ...members: RedisValue[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  sismember(key: string, member: RedisValue): Promise<number>;

  // Utility methods
  ping(): Promise<boolean>;
  flushdb(): Promise<'OK'>;
  keys(pattern: string): Promise<string[]>;

  // Health and monitoring
  getHealthCheck(): Promise<RedisHealthCheck>;
  getConnectionStatus(): RedisConnectionStatus;

  // Connection management
  disconnect(): Promise<void>;
  quit(): Promise<'OK'>;
}
