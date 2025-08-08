import { Router, Response } from 'express';
import { AuthRequest, redisService } from '@monorepo/shared';
import {
  rateLimitConfigSchema,
  RateLimitConfigBody,
} from '../validators/rate-limit.validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role-guard.middleware';
import { logger } from '../utils/logger';

const router: Router = Router();

// Apply auth middleware and require admin role
router.use(authMiddleware, requireAdmin);

router.post('/config', async (req: AuthRequest, res: Response) => {
  try {
    // Validate request body
    const { error, value } = rateLimitConfigSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: error.details[0].message,
      });
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

    logger.info('Rate limit config updated', {
      apiKey: config.apiKey,
      capacity: config.capacity,
      refillRate: config.refillRate,
      updatedBy: req.user?.id,
    });

    return res.status(200).json({
      success: true,
      message: 'Rate limit configuration updated successfully',
      data: config,
    });
  } catch (error) {
    logger.error('Error updating rate limit config:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update rate limit configuration',
    });
  }
});

export { router as rateLimitRoutes };
