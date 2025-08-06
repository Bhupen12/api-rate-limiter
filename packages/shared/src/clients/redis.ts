import Redis, { Cluster } from 'ioredis';
import winston, { createLogger, Logger } from 'winston';
import {
  getRedisConfig,
  getRedisClusterConfig,
  isClusterMode,
} from '../config/redis';
import { RedisConnectionStatus } from '../types/redis';

/**
 * Redis client wrapper that provides connection management, event handling,
 * and automatic reconnection for both single Redis instances and Redis clusters.
 * This class handles the low-level Redis connection and provides a unified
 * interface for Redis operations with comprehensive logging and error handling.
 *
 * @example
 * ```typescript
 * import { getRedisClient } from './redis';
 *
 * // Get the singleton Redis client instance
 * const redisClient = getRedisClient();
 *
 * // Get the underlying Redis client for direct operations
 * const client = redisClient.getClient();
 * await client.set('key', 'value');
 *
 * // Check connection status
 * const status = redisClient.getConnectionStatus();
 * console.log('Connected:', status.connected, 'Ready:', status.ready);
 *
 * // Test connectivity
 * const isConnected = await redisClient.isConnected();
 * if (isConnected) {
 *   console.log('Redis is responding');
 * }
 *
 * // Manual reconnection if needed
 * await redisClient.reconnect();
 *
 * // Graceful shutdown
 * await redisClient.disconnect();
 * ```
 */
export class RedisClient {
  private client: Redis | Cluster;
  private logger: Logger;
  private connectionStatus: RedisConnectionStatus;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isCluster: boolean;

  /**
   * Creates a new Redis client instance with automatic configuration
   * based on environment settings. Supports both single Redis instances
   * and Redis clusters with comprehensive event handling and logging.
   *
   * @example
   * ```typescript
   * // The constructor automatically detects cluster mode and configures accordingly
   * const redisClient = new RedisClient();
   *
   * // Check if it's a cluster setup
   * const status = redisClient.getConnectionStatus();
   * console.log('Connection status:', status);
   * ```
   */
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

  /**
   * Creates a Winston logger instance configured for Redis client operations.
   * Includes timestamp, error stack traces, and JSON formatting.
   *
   * @returns Configured Winston logger instance
   *
   * @example
   * ```typescript
   * // Logger is automatically created in constructor
   * // You can access it via this.logger if needed
   * this.logger.info('Custom log message');
   * this.logger.error('Error occurred', { error: 'details' });
   * ```
   */
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

  /**
   * Creates and configures the Redis client based on cluster mode detection.
   * For clusters, creates a Redis.Cluster instance with cluster-specific options.
   * For single instances, creates a Redis instance with retry and reconnection strategies.
   *
   * @returns Configured Redis or Cluster instance
   *
   * @example
   * ```typescript
   * // This method is called automatically in the constructor
   * // It handles both single Redis and cluster configurations
   *
   * // For single Redis:
   * // - Uses getRedisConfig() for connection settings
   * // - Implements exponential backoff retry strategy
   * // - Handles READONLY errors with automatic reconnection
   *
   * // For Redis Cluster:
   * // - Uses getRedisClusterConfig() for cluster settings
   * // - Configures cluster-specific options like slots refresh
   * // - Disables offline queue for better error handling
   * ```
   */
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

  /**
   * Sets up comprehensive event handlers for Redis connection lifecycle events.
   * Handles connection, ready, error, close, reconnecting, and end events.
   * For clusters, also handles node-specific events like node errors and topology changes.
   *
   * @example
   * ```typescript
   * // Event handlers are automatically set up in the constructor
   * // They provide comprehensive logging and status tracking
   *
   * // Events handled:
   * // - connect: Connection established
   * // - ready: Client ready to receive commands
   * // - error: Connection or operation errors
   * // - close: Connection closed
   * // - reconnecting: Attempting to reconnect
   * // - end: Connection ended permanently
   *
   * // Cluster-specific events:
   * // - node error: Individual node errors
   * // - +node: Node added to cluster
   * // - -node: Node removed from cluster
   * ```
   */
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

  /**
   * Gets the underlying Redis or Cluster client instance.
   * Use this method to access the raw Redis client for direct operations
   * when you need more control over Redis commands.
   *
   * @returns The underlying Redis or Cluster client instance
   *
   * @example
   * ```typescript
   * const redisClient = getRedisClient();
   * const client = redisClient.getClient();
   *
   * // Direct Redis operations
   * await client.set('key', 'value');
   * const value = await client.get('key');
   *
   * // Pipeline operations
   * const pipeline = client.pipeline();
   * pipeline.set('key1', 'value1');
   * pipeline.set('key2', 'value2');
   * await pipeline.exec();
   *
   * // Transaction operations
   * const multi = client.multi();
   * multi.set('key1', 'value1');
   * multi.set('key2', 'value2');
   * await multi.exec();
   * ```
   */
  public getClient(): Redis | Cluster {
    return this.client;
  }

  /**
   * Gets the current connection status information.
   * Returns a copy of the connection status to prevent external modification.
   *
   * @returns Current connection status including connected, ready, reconnecting states
   *
   * @example
   * ```typescript
   * const redisClient = getRedisClient();
   * const status = redisClient.getConnectionStatus();
   *
   * console.log('Connection Status:', {
   *   connected: status.connected,
   *   ready: status.ready,
   *   reconnecting: status.reconnecting,
   *   connectionCount: status.connectionCount
   * });
   *
   * if (status.lastError) {
   *   console.log('Last Error:', status.lastError.message);
   * }
   *
   * // Use for health checks
   * if (!status.connected) {
   *   console.log('Redis is disconnected');
   *   // Handle disconnection...
   * }
   *
   * if (status.reconnecting) {
   *   console.log('Redis is attempting to reconnect...');
   * }
   * ```
   */
  public getConnectionStatus(): RedisConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Tests the Redis connection by sending a PING command.
   * This method provides a simple way to check if Redis is responding.
   *
   * @returns true if Redis responds to PING, false otherwise
   *
   * @example
   * ```typescript
   * const redisClient = getRedisClient();
   *
   * // Simple connectivity test
   * const isConnected = await redisClient.isConnected();
   * if (isConnected) {
   *   console.log('Redis is responding');
   * } else {
   *   console.log('Redis is not responding');
   * }
   *
   * // Use in health checks
   * async function healthCheck() {
   *   const isHealthy = await redisClient.isConnected();
   *   if (!isHealthy) {
   *     console.log('Redis health check failed');
   *     // Trigger alerts or fallback logic
   *   }
   *   return isHealthy;
   * }
   *
   * // Periodic health monitoring
   * setInterval(async () => {
   *   const healthy = await redisClient.isConnected();
   *   if (!healthy) {
   *     console.log('Redis connectivity issue detected');
   *   }
   * }, 30000); // Check every 30 seconds
   * ```
   */
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

  /**
   * Gracefully disconnects from Redis.
   * Attempts to quit gracefully first, then forces disconnect if needed.
   *
   * @returns Promise that resolves when disconnection is complete
   *
   * @example
   * ```typescript
   * const redisClient = getRedisClient();
   *
   * // Graceful shutdown
   * try {
   *   await redisClient.disconnect();
   *   console.log('Redis disconnected gracefully');
   * } catch (error) {
   *   console.error('Error during disconnect:', error);
   * }
   *
   * // Use in application shutdown
   * process.on('SIGTERM', async () => {
   *   console.log('Shutting down...');
   *   await redisClient.disconnect();
   *   process.exit(0);
   * });
   *
   * process.on('SIGINT', async () => {
   *   console.log('Interrupted, shutting down...');
   *   await redisClient.disconnect();
   *   process.exit(0);
   * });
   * ```
   */
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

  /**
   * Manually triggers a reconnection to Redis.
   * Resets the reconnection attempt counter and attempts to establish a new connection.
   *
   * @returns Promise that resolves when reconnection is complete
   * @throws Error if manual reconnection fails
   *
   * @example
   * ```typescript
   * const redisClient = getRedisClient();
   *
   * // Manual reconnection
   * try {
   *   await redisClient.reconnect();
   *   console.log('Redis reconnected successfully');
   * } catch (error) {
   *   console.error('Reconnection failed:', error);
   *   // Handle reconnection failure
   * }
   *
   * // Use in error recovery
   * async function recoverConnection() {
   *   const status = redisClient.getConnectionStatus();
   *
   *   if (!status.connected && !status.reconnecting) {
   *     console.log('Attempting manual reconnection...');
   *     try {
   *       await redisClient.reconnect();
   *       console.log('Recovery successful');
   *     } catch (error) {
   *       console.error('Recovery failed:', error);
   *       // Implement fallback logic
   *     }
   *   }
   * }
   *
   * // Periodic connection recovery
   * setInterval(async () => {
   *   const isConnected = await redisClient.isConnected();
   *   if (!isConnected) {
   *     await recoverConnection();
   *   }
   * }, 60000); // Check every minute
   * ```
   */
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

/**
 * Singleton instance of the Redis client.
 * Provides a single, shared Redis client instance across the application.
 *
 * @example
 * ```typescript
 * import { getRedisClient } from './redis';
 *
 * // Get the singleton instance
 * const redisClient = getRedisClient();
 *
 * // Use throughout your application
 * const client = redisClient.getClient();
 * await client.set('key', 'value');
 * ```
 */
let redisClientInstance: RedisClient | null = null;

/**
 * Gets or creates the singleton Redis client instance.
 * This function ensures only one Redis client instance exists across the application,
 * providing efficient resource usage and consistent connection management.
 *
 * @returns The singleton Redis client instance
 *
 * @example
 * ```typescript
 * import { getRedisClient } from './redis';
 *
 * // First call creates the instance
 * const redisClient1 = getRedisClient();
 *
 * // Subsequent calls return the same instance
 * const redisClient2 = getRedisClient();
 * console.log(redisClient1 === redisClient2); // true
 *
 * // Use the client
 * const client = redisClient1.getClient();
 * await client.set('key', 'value');
 *
 * // Check connection status
 * const status = redisClient1.getConnectionStatus();
 * console.log('Connected:', status.connected);
 * ```
 */
export const getRedisClient = (): RedisClient => {
  if (!redisClientInstance) {
    redisClientInstance = new RedisClient();
  }
  return redisClientInstance;
};

/**
 * Gracefully disconnects the singleton Redis client instance and clears the reference.
 * This function should be called during application shutdown to ensure proper cleanup.
 *
 * @returns Promise that resolves when disconnection is complete
 *
 * @example
 * ```typescript
 * import { disconnectRedisClient } from './redis';
 *
 * // Graceful shutdown
 * process.on('SIGTERM', async () => {
 *   console.log('Shutting down application...');
 *   await disconnectRedisClient();
 *   console.log('Redis client disconnected');
 *   process.exit(0);
 * });
 *
 * // Or in your cleanup function
 * async function cleanup() {
 *   try {
 *     await disconnectRedisClient();
 *     console.log('Cleanup completed');
 *   } catch (error) {
 *     console.error('Cleanup failed:', error);
 *   }
 * }
 *
 * // Manual cleanup if needed
 * await disconnectRedisClient();
 * ```
 */
export const disconnectRedisClient = async (): Promise<void> => {
  if (redisClientInstance) {
    await redisClientInstance.disconnect();
    redisClientInstance = null;
  }
};
