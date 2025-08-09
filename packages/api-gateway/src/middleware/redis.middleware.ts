import { RequestHandler, Request, Response, NextFunction } from 'express';
import Redis, { RedisOptions } from 'ioredis';
import { logger } from '../utils/logger';

class RedisConnection {
  private static instance: Redis;
  private static isConnected: boolean = false;

  static async getClient(): Promise<Redis> {
    if (!RedisConnection.instance) {
      await RedisConnection.initialize();
    }
    return RedisConnection.instance;
  }

  private static async initialize(): Promise<void> {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const redisPassword = process.env.REDIS_PASSWORD;

    const redisOptions: RedisOptions = {
      password: redisPassword,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 10000,
      enableReadyCheck: true,
      maxLoadingRetryTime: 5000,
    };

    // Parse Redis URL to extract host and port if needed
    if (redisUrl.startsWith('redis://')) {
      RedisConnection.instance = new Redis(redisUrl, redisOptions);
    } else {
      // Fallback for host:port format
      const [host, port] = redisUrl.split(':');
      RedisConnection.instance = new Redis(
        parseInt(port || '6379', 10),
        host || 'localhost',
        redisOptions
      );
    }

    RedisConnection.instance.on('connect', () => {
      logger.info('Redis connection established');
      RedisConnection.isConnected = true;
    });

    RedisConnection.instance.on('error', (error) => {
      logger.error('Redis connection error:', error);
      RedisConnection.isConnected = false;
    });

    RedisConnection.instance.on('close', () => {
      logger.warn('Redis connection closed');
      RedisConnection.isConnected = false;
    });

    RedisConnection.instance.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });

    try {
      await RedisConnection.instance.connect();
      logger.info('Redis client initialized successfully');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  static async disconnect(): Promise<void> {
    if (RedisConnection.instance) {
      await RedisConnection.instance.quit();
      logger.info('Redis connection closed');
    }
  }

  static isRedisConnected(): boolean {
    return (
      RedisConnection.isConnected && RedisConnection.instance.status === 'ready'
    );
  }
}

// Middleware to attach Redis client to request
export const redisMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const redis = await RedisConnection.getClient();

    if (!RedisConnection.isRedisConnected()) {
      logger.error('Redis is not connected');
      res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable - Redis connection failed',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    (req as any).redis = redis;
    next();
  } catch (error) {
    logger.error('Redis middleware error:', error);
    res.status(503).json({
      success: false,
      error: 'Service temporarily unavailable - Redis connection failed',
      timestamp: new Date().toISOString(),
    });
  }
};

// Export the RedisConnection class for shutdown handling
export { RedisConnection };
