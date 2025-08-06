import { RedisConfig, RedisClusterConfig } from '../types/redis';

/**
 * Retrieves Redis configuration from environment variables with sensible defaults.
 * This function reads all Redis-related environment variables and returns a
 * properly configured RedisConfig object for single Redis instance connections.
 *
 * @returns RedisConfig object with environment-based configuration
 *
 * @example
 * ```typescript
 * // Basic usage with defaults
 * const config = getRedisConfig();
 * console.log('Redis host:', config.host); // 'localhost'
 * console.log('Redis port:', config.port); // 6379
 *
 * // Environment variables used:
 * // REDIS_HOST=redis.example.com
 * // REDIS_PORT=6380
 * // REDIS_PASSWORD=your_password
 * // REDIS_DB=1
 * // REDIS_KEY_PREFIX=myapp:
 * // REDIS_MAX_RETRIES=5
 * // REDIS_RETRY_DELAY=200
 * // REDIS_READY_CHECK=false
 * // REDIS_LAZY_CONNECT=true
 * // REDIS_KEEP_ALIVE=60000
 * // REDIS_FAMILY=6
 * // REDIS_CONNECT_TIMEOUT=15000
 * // REDIS_COMMAND_TIMEOUT=10000
 * // REDIS_MAXMEMORY_POLICY=allkeys-lru
 *
 * // Example .env file:
 * // REDIS_HOST=redis.example.com
 * // REDIS_PORT=6379
 * // REDIS_PASSWORD=your_secure_password
 * // REDIS_DB=0
 * // REDIS_KEY_PREFIX=prod:
 * // REDIS_MAX_RETRIES=3
 * // REDIS_RETRY_DELAY=100
 * // REDIS_READY_CHECK=true
 * // REDIS_LAZY_CONNECT=false
 * // REDIS_KEEP_ALIVE=30000
 * // REDIS_FAMILY=4
 * // REDIS_CONNECT_TIMEOUT=10000
 * // REDIS_COMMAND_TIMEOUT=5000
 * // REDIS_MAXMEMORY_POLICY=volatile-lru
 * ```
 */
export const getRedisConfig = (): RedisConfig => {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'app:',
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
    retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100', 10),
    enableReadyCheck: process.env.REDIS_READY_CHECK !== 'false',
    lazyConnect: process.env.REDIS_LAZY_CONNECT === 'true',
    keepAlive: parseInt(process.env.REDIS_KEEP_ALIVE || '30000', 10),
    family: parseInt(process.env.REDIS_FAMILY || '4', 10), // 4 for IPv4, 6 for IPv6
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10),
    commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000', 10),
    maxmemoryPolicy: process.env.REDIS_MAXMEMORY_POLICY,
  };
};

/**
 * Retrieves Redis cluster configuration from environment variables.
 * This function parses the REDIS_CLUSTER_NODES environment variable to create
 * a properly configured RedisClusterConfig object for Redis cluster connections.
 *
 * @returns RedisClusterConfig object with environment-based configuration
 *
 * @example
 * ```typescript
 * // Basic usage with default single node
 * const clusterConfig = getRedisClusterConfig();
 * console.log('Cluster nodes:', clusterConfig.nodes);
 * // Output: [{ host: 'localhost', port: 6379 }]
 *
 * // Environment variables used:
 * // REDIS_CLUSTER_NODES=node1:7000,node2:7001,node3:7002
 * // REDIS_PASSWORD=cluster_password
 * // REDIS_KEY_PREFIX=cluster:
 * // REDIS_MAX_RETRIES=5
 * // REDIS_RETRY_DELAY=200
 * // REDIS_READY_CHECK=true
 * // REDIS_DB=0
 *
 * // Example .env file for cluster:
 * // REDIS_CLUSTER_MODE=true
 * // REDIS_CLUSTER_NODES=redis-node-1:7000,redis-node-2:7001,redis-node-3:7002
 * // REDIS_PASSWORD=your_cluster_password
 * // REDIS_KEY_PREFIX=prod:cluster:
 * // REDIS_MAX_RETRIES=3
 * // REDIS_RETRY_DELAY=100
 * // REDIS_READY_CHECK=true
 * // REDIS_DB=0
 *
 * // Example with multiple cluster nodes:
 * // REDIS_CLUSTER_NODES=redis-cluster-1.example.com:7000,redis-cluster-2.example.com:7000,redis-cluster-3.example.com:7000
 *
 * // Local development cluster:
 * // REDIS_CLUSTER_NODES=localhost:7000,localhost:7001,localhost:7002
 * ```
 */
export const getRedisClusterConfig = (): RedisClusterConfig => {
  const nodes = process.env.REDIS_CLUSTER_NODES
    ? process.env.REDIS_CLUSTER_NODES.split(',').map((node) => {
        const [host, port] = node.trim().split(':');
        return { host, port: parseInt(port, 10) };
      })
    : [{ host: 'localhost', port: 6379 }];

  return {
    nodes,
    password: process.env.REDIS_PASSWORD,
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'app:',
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
    retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100', 10),
    enableReadyCheck: process.env.REDIS_READY_CHECK !== 'false',
    redisOptions: {
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
    },
  };
};

/**
 * Determines whether Redis cluster mode is enabled based on environment configuration.
 * This function checks the REDIS_CLUSTER_MODE environment variable to decide
 * whether to use Redis cluster or single instance mode.
 *
 * @returns true if cluster mode is enabled, false for single instance mode
 *
 * @example
 * ```typescript
 * // Check if cluster mode is enabled
 * const isCluster = isClusterMode();
 *
 * if (isCluster) {
 *   console.log('Using Redis cluster mode');
 *   const clusterConfig = getRedisClusterConfig();
 *   // Use cluster configuration
 * } else {
 *   console.log('Using Redis single instance mode');
 *   const config = getRedisConfig();
 *   // Use single instance configuration
 * }
 *
 * // Environment variable:
 * // REDIS_CLUSTER_MODE=true  // Enable cluster mode
 * // REDIS_CLUSTER_MODE=false // Disable cluster mode (default)
 *
 * // Example usage in application startup:
 * ```typescript
 * import { isClusterMode, getRedisConfig, getRedisClusterConfig } from './config/redis';
 *
 * function initializeRedis() {
 *   if (isClusterMode()) {
 *     console.log('Initializing Redis cluster...');
 *     const config = getRedisClusterConfig();
 *     console.log(`Connecting to ${config.nodes.length} cluster nodes`);
 *     // Initialize cluster client
 *   } else {
 *     console.log('Initializing Redis single instance...');
 *     const config = getRedisConfig();
 *     console.log(`Connecting to ${config.host}:${config.port}`);
 *     // Initialize single instance client
 *   }
 * }
 * ```
 *
 * // Example .env configurations:
 *
 * // For single Redis instance:
 * // REDIS_CLUSTER_MODE=false
 * // REDIS_HOST=localhost
 * // REDIS_PORT=6379
 *
 * // For Redis cluster:
 * // REDIS_CLUSTER_MODE=true
 * // REDIS_CLUSTER_NODES=node1:7000,node2:7001,node3:7002
 * ```
 */
export const isClusterMode = (): boolean => {
  return process.env.REDIS_CLUSTER_MODE === 'true';
};
