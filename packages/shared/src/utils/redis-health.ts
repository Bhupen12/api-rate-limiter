// packages/shared/src/utils/redis-health.ts

import { redisService } from '../services/redis.service';
import { RedisHealthCheck, RedisConnectionStatus } from '../types/redis';

export class RedisHealthMonitor {
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastHealthCheck: RedisHealthCheck | null = null;
  private healthCheckCallbacks: Array<(health: RedisHealthCheck) => void> = [];

  /**
   * Start periodic health checks
   * @param intervalMs - Interval between health checks in milliseconds
   */
  startPeriodicHealthCheck(intervalMs: number = 30000): void {
    if (this.healthCheckInterval) {
      this.stopPeriodicHealthCheck();
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.performHealthCheck();
        this.notifyHealthCallbacks(health);
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop periodic health checks
   */
  stopPeriodicHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Perform a single health check
   */
  async performHealthCheck(): Promise<RedisHealthCheck> {
    const health = await redisService.getHealthCheck();
    this.lastHealthCheck = health;
    return health;
  }

  /**
   * Get the last performed health check result
   */
  getLastHealthCheck(): RedisHealthCheck | null {
    return this.lastHealthCheck;
  }

  /**
   * Register a callback to be notified of health check results
   */
  onHealthCheck(callback: (health: RedisHealthCheck) => void): void {
    this.healthCheckCallbacks.push(callback);
  }

  /**
   * Remove a health check callback
   */
  removeHealthCallback(callback: (health: RedisHealthCheck) => void): void {
    const index = this.healthCheckCallbacks.indexOf(callback);
    if (index > -1) {
      this.healthCheckCallbacks.splice(index, 1);
    }
  }

  private notifyHealthCallbacks(health: RedisHealthCheck): void {
    this.healthCheckCallbacks.forEach((callback) => {
      try {
        callback(health);
      } catch (error) {
        console.error('Health check callback error:', error);
      }
    });
  }

  /**
   * Get detailed connection information
   */
  getConnectionInfo(): RedisConnectionStatus {
    return redisService.getConnectionStatus();
  }

  /**
   * Check if Redis is currently available for operations
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await redisService.ping();
    } catch {
      return false;
    }
  }

  /**
   * Wait for Redis to become available
   * @param timeoutMs - Maximum time to wait in milliseconds
   * @param checkIntervalMs - Interval between availability checks
   */
  async waitForAvailability(
    timeoutMs: number = 30000,
    checkIntervalMs: number = 1000
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (await this.isAvailable()) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, checkIntervalMs));
    }

    return false;
  }

  /**
   * Get Redis server information in a formatted way
   */
  async getServerInfo(): Promise<{
    version: string;
    mode: string;
    uptime: string;
    memory: {
      used: string;
      peak: string;
      fragmentation: number;
    };
    connections: number;
    commands: {
      processed: number;
      perSecond: number;
    };
    keyspace: Record<string, { keys: number; expires: number }>;
  }> {
    try {
      const client = redisService['client'].getClient();
      const info = await client.info();
      const lines = info.split('\r\n');
      const infoObj: Record<string, string> = {};

      lines.forEach((line) => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          infoObj[key] = value;
        }
      });

      // Parse keyspace info
      const keyspace: Record<string, { keys: number; expires: number }> = {};
      Object.keys(infoObj)
        .filter((key) => key.startsWith('db'))
        .forEach((dbKey) => {
          const dbInfo = infoObj[dbKey];
          const matches = dbInfo.match(/keys=(\d+),expires=(\d+)/);
          if (matches) {
            keyspace[dbKey] = {
              keys: parseInt(matches[1], 10),
              expires: parseInt(matches[2], 10),
            };
          }
        });

      return {
        version: infoObj.redis_version || 'unknown',
        mode: infoObj.redis_mode || 'standalone',
        uptime: this.formatUptime(
          parseInt(infoObj.uptime_in_seconds || '0', 10)
        ),
        memory: {
          used: infoObj.used_memory_human || '0B',
          peak: infoObj.used_memory_peak_human || '0B',
          fragmentation: parseFloat(infoObj.mem_fragmentation_ratio || '1'),
        },
        connections: parseInt(infoObj.connected_clients || '0', 10),
        commands: {
          processed: parseInt(infoObj.total_commands_processed || '0', 10),
          perSecond: parseFloat(infoObj.instantaneous_ops_per_sec || '0'),
        },
        keyspace,
      };
    } catch (error) {
      throw new Error(`Failed to get server info: ${(error as Error).message}`);
    }
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  }
}

// Singleton instance
export const redisHealthMonitor = new RedisHealthMonitor();

// Express.js health check middleware
export const createRedisHealthMiddleware = () => {
  return async (req: any, res: any, _next: any) => {
    try {
      const health = await redisService.getHealthCheck();
      const connectionStatus = redisService.getConnectionStatus();

      res.json({
        redis: {
          status: health.status,
          latency: `${health.latency}ms`,
          version: health.version,
          uptime: `${health.uptime}s`,
          memory: health.memory,
          connections: health.connections,
          connection: {
            connected: connectionStatus.connected,
            ready: connectionStatus.ready,
            reconnecting: connectionStatus.reconnecting,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        redis: {
          status: 'unhealthy',
          error: (error as Error).message,
        },
        timestamp: new Date().toISOString(),
      });
    }
  };
};
