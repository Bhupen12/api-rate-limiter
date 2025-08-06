import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';
import { createRedisHealthMiddleware } from '@monorepo/shared';

const router: Router = Router();
const healthController = new HealthController();

router.get('/', healthController.check);
router.get('/ready', healthController.readiness);
router.get('/live', healthController.liveness);
router.get('/redis', createRedisHealthMiddleware());

export { router as healthRoutes };
