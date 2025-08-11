import { Router } from 'express';
import { RateLimitController } from '../controllers/rate-limit.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role-guard.middleware';
import { redisMiddleware } from '../middleware/redis.middleware';
import { asyncHandler } from '../utils/async-handler.utils';

export const rateLimitRoutes: Router = Router();

rateLimitRoutes.use(authMiddleware, requireAdmin, redisMiddleware);

rateLimitRoutes.post('/config', asyncHandler(RateLimitController.updateConfig));
rateLimitRoutes.put(
  '/config/:apiKey',
  asyncHandler(RateLimitController.updateConfig)
);
rateLimitRoutes.get('/', asyncHandler(RateLimitController.listConfigs));
rateLimitRoutes.get('/:apiKey', asyncHandler(RateLimitController.getConfig));
rateLimitRoutes.delete(
  '/:apiKey',
  asyncHandler(RateLimitController.deleteConfig)
);
