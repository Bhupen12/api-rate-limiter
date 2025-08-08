import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role-guard.middleware';
import { RateLimitController } from '../controllers/rate-limit.controller';

const router: Router = Router();

// Apply auth middleware and require admin role
router.use(authMiddleware, requireAdmin);

router.post('/config', RateLimitController.updateConfig);

export { router as rateLimitRoutes };
