import { Response } from 'express';
import { ApiResponse, AuthRequest, redisService } from '@monorepo/shared';
import {
  RateLimitConfigBody,
  rateLimitConfigSchema,
} from '../validators/rate-limit.validator';
import { logger } from '../utils/logger';

export class RateLimitController {
  static async updateConfig(req: AuthRequest, res: Response) {
    try {
      // Validate request body
      const { error, value } = rateLimitConfigSchema.validate(req.body);
      if (error) {
        logger.warn('Rate limit config validation failed', {
          error: error.details[0].message,
          userId: req.user?.id,
        });
        return res.status(400).json({
          success: false,
          error: error.details[0].message,
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }

      const config: RateLimitConfigBody = value;

      // Save config to Redis hash
      const hashKey = 'rl:config';
      await redisService.hset(
        hashKey,
        config.apiKey,
        JSON.stringify({
          capacity: config.capacity,
          refillRate: config.refillRate,
          updatedAt: new Date().toISOString(),
          updatedBy: req.user?.id,
        })
      );

      logger.info('Rate limit config updated successfully', {
        apiKey: config.apiKey,
        capacity: config.capacity,
        refillRate: config.refillRate,
        updatedBy: req.user?.id,
      });

      return res.status(200).json({
        success: true,
        message: 'Rate limit configuration updated successfully',
        data: config,
        timestamp: new Date().toISOString(),
      } as ApiResponse<RateLimitConfigBody>);
    } catch (error) {
      logger.error('Failed to update rate limit config', {
        error,
        userId: req.user?.id,
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to update rate limit configuration',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }
}
