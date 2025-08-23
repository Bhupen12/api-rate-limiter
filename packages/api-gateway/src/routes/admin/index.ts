import { Router } from 'express';
import { rateLimitRoutes } from './rate-limiter.routes';
import { geoBlockRoutes } from './geo-block.routes';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/role-guard.middleware';
import { adminRateLimiterMiddleware } from '../../middleware/admin.middleware';

const adminRouter: Router = Router();

// 🔒 All admin routes protected here
adminRouter.use(authMiddleware, requireAdmin, adminRateLimiterMiddleware);

// Mount admin-only feature routers
adminRouter.use('/rate-limits', rateLimitRoutes);
adminRouter.use('/geo', geoBlockRoutes);

export { adminRouter };
