import { Router } from 'express';
import { RateLimitController } from '../../controllers/rate-limit.controller';
import { asyncHandler } from '../../utils/async-handler.utils';

const { updateConfig, getConfig, deleteConfig, listConfigs } =
  RateLimitController;

export const rateLimitRoutes: Router = Router();

rateLimitRoutes.post('/config', asyncHandler(updateConfig));
rateLimitRoutes.put('/config/:apiKey', asyncHandler(updateConfig));

rateLimitRoutes.get('/', asyncHandler(listConfigs));
rateLimitRoutes.get('/:apiKey', asyncHandler(getConfig));
rateLimitRoutes.delete('/:apiKey', asyncHandler(deleteConfig));
