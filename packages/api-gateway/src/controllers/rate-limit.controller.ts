import { Request, Response } from 'express';
import type { Redis } from 'ioredis';
import { logger } from '../utils/logger';
import {
  RateLimitConfig,
  RateLimitConfigSchema,
} from '../validators/rate-limit.validator';

const CONFIG_KEY = 'rl:config';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// Request type including redis client (you should also augment express globally in api-gateway)
type ReqWithRedis = Request & { redis: Redis };

/** Helper: safe JSON parse - returns undefined on parse error and logs warning */
function safeJsonParse<T = any>(
  value: string | null | undefined,
  ctx = ''
): T | undefined {
  if (value == null) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch (err) {
    logger.warn(`Failed to parse JSON for ${ctx}: ${String(err)}`);
    return undefined;
  }
}

export class RateLimitController {
  static async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const parsed = RateLimitConfigSchema.safeParse(req.body);

      if (!parsed.success) {
        const errors = parsed.error.issues
          .map((e) => `${e.path.join('.') || 'body'}: ${e.message}`)
          .join('; ');
        res.status(400).json({
          success: false,
          error: `Validation error: ${errors}`,
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const { apiKey, capacity, refillRate } = parsed.data as RateLimitConfig;

      // attach redis type-safe
      const client = (req as ReqWithRedis).redis;
      if (!client) {
        logger.error('Redis client missing in request');
        res.status(503).json({
          success: false,
          error: 'Service temporarily unavailable - Redis not attached',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const configValue = JSON.stringify({ capacity, refillRate });

      // hset returns number of fields added (>=0)
      await client.hset(CONFIG_KEY, apiKey, configValue);

      logger.info(`Rate limit configuration upserted for API key: ${apiKey}`, {
        apiKey,
        capacity,
        refillRate,
      });

      res.status(200).json({
        success: true,
        data: { apiKey, capacity, refillRate },
        message: 'Rate limit configuration updated successfully',
        timestamp: new Date().toISOString(),
      } as ApiResponse<RateLimitConfig>);
    } catch (error) {
      logger.error('Rate limit configuration update error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  static async getConfig(req: Request, res: Response): Promise<void> {
    try {
      const { apiKey } = req.params;

      if (!apiKey) {
        res.status(400).json({
          success: false,
          error: 'API key parameter is required',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const client = (req as ReqWithRedis).redis;
      if (!client) {
        res.status(503).json({
          success: false,
          error: 'Service temporarily unavailable - Redis not attached',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const configValue = await client.hget(CONFIG_KEY, apiKey);

      if (!configValue) {
        const defaultCapacity = parseInt(
          process.env.DEFAULT_CAPACITY || '100',
          10
        );
        const defaultRefillRate = parseFloat(
          process.env.DEFAULT_REFILL_RATE || '1'
        );

        res.status(200).json({
          success: true,
          data: {
            apiKey,
            capacity: defaultCapacity,
            refillRate: defaultRefillRate,
            isDefault: true,
          },
          message: 'Default rate limit configuration retrieved',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const config = safeJsonParse<{ capacity: number; refillRate: number }>(
        configValue,
        `hget:${apiKey}`
      );

      if (!config) {
        // corrupted value — fallback to default
        logger.warn(
          `Corrupted rate limit config for ${apiKey}, falling back to defaults.`
        );
        const defaultCapacity = parseInt(
          process.env.DEFAULT_CAPACITY || '100',
          10
        );
        const defaultRefillRate = parseFloat(
          process.env.DEFAULT_REFILL_RATE || '1'
        );

        res.status(200).json({
          success: true,
          data: {
            apiKey,
            capacity: defaultCapacity,
            refillRate: defaultRefillRate,
            isDefault: true,
          },
          message:
            'Default rate limit configuration retrieved (stored config corrupted)',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: { apiKey, ...config, isDefault: false },
        message: 'Rate limit configuration retrieved successfully',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Rate limit configuration retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  static async deleteConfig(req: Request, res: Response): Promise<void> {
    try {
      const { apiKey } = req.params;

      if (!apiKey) {
        res.status(400).json({
          success: false,
          error: 'API key parameter is required',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const client = (req as ReqWithRedis).redis;
      if (!client) {
        res.status(503).json({
          success: false,
          error: 'Service temporarily unavailable - Redis not attached',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const deleted = await client.hdel(CONFIG_KEY, apiKey);

      if (deleted === 0) {
        res.status(404).json({
          success: false,
          error: 'Rate limit configuration not found for the specified API key',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      logger.info(`Rate limit configuration deleted for API key: ${apiKey}`);

      res.status(200).json({
        success: true,
        data: { apiKey },
        message: 'Rate limit configuration deleted successfully',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Rate limit configuration deletion error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  static async listConfigs(req: Request, res: Response): Promise<void> {
    try {
      const client = (req as ReqWithRedis).redis;
      if (!client) {
        res.status(503).json({
          success: false,
          error: 'Service temporarily unavailable - Redis not attached',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const allConfigs = await client.hgetall(CONFIG_KEY);
      const configurations = Object.entries(allConfigs).reduce(
        (acc: any[], [apiKey, configValue]) => {
          const config = safeJsonParse<{
            capacity: number;
            refillRate: number;
          }>(configValue, `hgetall:${apiKey}`);
          if (!config) {
            logger.warn(`Skipping corrupted config for ${apiKey}`);
            return acc;
          }
          acc.push({ apiKey, ...config });
          return acc;
        },
        []
      );

      res.status(200).json({
        success: true,
        data: { configurations, count: configurations.length },
        message: 'Rate limit configurations retrieved successfully',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Rate limit configurations listing error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }
}
