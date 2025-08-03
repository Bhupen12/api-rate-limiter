import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';

const router: Router = Router();
const healthController = new HealthController();

router.get('/', healthController.check);
router.get('/ready', healthController.readiness);
router.get('/live', healthController.liveness);

export { router as healthRoutes };
