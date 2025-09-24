import { Router } from 'express';
import { metricsRegister } from '../utils/metrics.utils';

export const metricsRoutes: Router = Router();

metricsRoutes.get('/', async (_req, res) => {
  res.set('Content-Type', metricsRegister.contentType);
  res.end(await metricsRegister.metrics());
});
