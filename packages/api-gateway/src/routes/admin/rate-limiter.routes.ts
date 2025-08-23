import { Router } from 'express';
import { RateLimitController } from '../../controllers/rate-limit.controller';
import { asyncHandler } from '../../utils/async-handler.utils';

export const rateLimitRoutes: Router = Router();

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
