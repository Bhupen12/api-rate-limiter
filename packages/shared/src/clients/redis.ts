import Redis, { Cluster } from 'ioredis';
import winston, { createLogger, Logger } from 'winston';
import {
  getRedisConfig,
  getRedisClusterConfig,
  isClusterMode,
} from '../config/redis';
import { RedisConnectionStatus } from '../types/redis';

export class RedisClient {
  private client: Redis | Cluster;
  private logger: Logger;
  private connectionStatus: RedisConnectionStatus;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isCluster: boolean;

  constructor() {
    this.isCluster = isClusterMode();
    this.logger = this.createLogger();
    this.connectionStatus = {
      connected: false,
      ready: false,
      reconnecting: false,
      connectionCount: 0,
    };

    this.client = this.createClient();
    this.setupEventHandlers();
  }

  private createLogger(): Logger {
    return createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'redis-client' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      ],
    });
  }

  private createClient(): Redis | Cluster {
    if (this.isCluster) {
      const clusterConfig = getRedisClusterConfig();
      this.logger.info('Creating Redis cluster client', {
        nodes: clusterConfig.nodes,
      });

      return new Redis.Cluster(clusterConfig.nodes, {
        ...clusterConfig,
        retryDelayOnClusterDown: clusterConfig.retryDelayOnFailover,
        slotsRefreshTimeout: 10000,
        slotsRefreshInterval: 5000,
        enableOfflineQueue: false,
      });
    } else {
      const config = getRedisConfig();
      this.logger.info('Creating Redis single instance client', {
        host: config.host,
        port: config.port,
        db: config.db,
      });

      return new Redis({
        ...config,
        enableOfflineQueue: false,
        // Exponential backoff retry strategy
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          this.logger.warn(
            `Redis connection retry attempt ${times}, delay: ${delay}ms`
          );
          return delay;
        },
        // Reconnect on error
        reconnectOnError: (err: Error) => {
          this.logger.error('Redis reconnectOnError triggered', {
            error: err.message,
          });
          const targetError = 'READONLY';
          return err.message.includes(targetError);
        },
      });
    }
  }

  private setupEventHandlers(): void {
    // Connection established
    this.client.on('connect', () => {
      this.connectionStatus.connected = true;
      this.connectionStatus.reconnecting = false;
      this.connectionStatus.connectionCount++;
      this.reconnectAttempts = 0;
      this.logger.info('Redis client connected');
    });

    // Client ready to receive commands
    this.client.on('ready', () => {
      this.connectionStatus.ready = true;
      this.logger.info('Redis client ready');
    });

    // Connection error
    this.client.on('error', (error: Error) => {
      this.connectionStatus.lastError = error;
      this.connectionStatus.ready = false;
      this.logger.error('Redis connection error', {
        error: error.message,
        stack: error.stack,
      });
    });

    // Connection closed
    this.client.on('close', () => {
      this.connectionStatus.connected = false;
      this.connectionStatus.ready = false;
      this.logger.warn('Redis connection closed');
    });

    // Reconnecting
    this.client.on('reconnecting', (delay: number) => {
      this.connectionStatus.reconnecting = true;
      this.reconnectAttempts++;
      this.logger.info('Redis client reconnecting', {
        delay,
        attempt: this.reconnectAttempts,
      });

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.logger.error(
          'Max reconnection attempts reached, stopping reconnection'
        );
        this.client.disconnect();
      }
    });

    // Connection ended
    this.client.on('end', () => {
      this.connectionStatus.connected = false;
      this.connectionStatus.ready = false;
      this.connectionStatus.reconnecting = false;
      this.logger.warn('Redis connection ended');
    });

    // Cluster-specific events
    if (this.isCluster) {
      const cluster = this.client as Cluster;

      cluster.on('node error', (error: Error, node: any) => {
        this.logger.error('Redis cluster node error', {
          error: error.message,
          node: `${node.options.host}:${node.options.port}`,
        });
      });

      cluster.on('+node', (node: any) => {
        this.logger.info('Redis cluster node added', {
          node: `${node.options.host}:${node.options.port}`,
        });
      });

      cluster.on('-node', (node: any) => {
        this.logger.warn('Redis cluster node removed', {
          node: `${node.options.host}:${node.options.port}`,
        });
      });
    }
  }

  public getClient(): Redis | Cluster {
    return this.client;
  }

  public getConnectionStatus(): RedisConnectionStatus {
    return { ...this.connectionStatus };
  }

  public async isConnected(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      this.logger.error('Redis ping failed', {
        error: (error as Error).message,
      });
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      this.logger.info('Disconnecting Redis client');
      await this.client.quit();
    } catch (error) {
      this.logger.error('Error during Redis disconnect', {
        error: (error as Error).message,
      });
      this.client.disconnect();
    }
  }

  public async reconnect(): Promise<void> {
    try {
      this.logger.info('Manually reconnecting Redis client');
      this.reconnectAttempts = 0;
      await this.client.connect();
    } catch (error) {
      this.logger.error('Manual reconnection failed', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

// Singleton instance
let redisClientInstance: RedisClient | null = null;

export const getRedisClient = (): RedisClient => {
  if (!redisClientInstance) {
    redisClientInstance = new RedisClient();
  }
  return redisClientInstance;
};

export const disconnectRedisClient = async (): Promise<void> => {
  if (redisClientInstance) {
    await redisClientInstance.disconnect();
    redisClientInstance = null;
  }
};
