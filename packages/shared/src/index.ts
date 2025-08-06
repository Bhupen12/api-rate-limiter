export * from './types';
export * from './utils';

//#region Redis
// Redis Types
export type {
  RedisConfig,
  RedisClusterConfig,
  SetOptions,
  RedisHealthCheck,
  RedisConnectionStatus,
  RedisValue,
  RedisServiceInterface,
} from './types/redis';

// Redis Configuration
export {
  getRedisConfig,
  getRedisClusterConfig,
  isClusterMode,
} from './config/redis';

// Redis Clients
export {
  RedisClient,
  getRedisClient,
  disconnectRedisClient,
} from './clients/redis';

// Redis Service
export {
  RedisService,
  getRedisService,
  redisService,
} from './services/redis.service';

// Health Monitoring
export {
  RedisHealthMonitor,
  redisHealthMonitor,
  createRedisHealthMiddleware,
} from './utils/redis-health';

// Default export for convenience
export { redisService as default } from './services/redis.service';

//#endregion Redis

export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const createApiResponse = <T = any>(
  success: boolean,
  data?: T,
  error?: string,
  message?: string
): any => ({
  success,
  data,
  error,
  message,
  timestamp: new Date().toISOString(),
});

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};
