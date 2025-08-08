import { Router } from 'express';
import {
  lenientRateLimitMiddleware,
  rateLimitMiddleware,
  strictRateLimitMiddleware,
} from '../middleware/rate-limit.middleware';
import { authRoutes } from './auth.routes';
import { healthRoutes } from './health.routes';
import { protectedRoutes } from './protected.routes';
import { rateLimitRoutes } from './rate-limit.routes';

const router: Router = Router();

// Mount routes
router.use('/health', lenientRateLimitMiddleware, healthRoutes);
router.use('/auth', strictRateLimitMiddleware, authRoutes);
router.use('/protected', rateLimitMiddleware, protectedRoutes);
router.use('/rate-limit', strictRateLimitMiddleware, rateLimitRoutes);

// API Gateway proxy routes would go here
// router.use('/api/v1/users', proxyToUserService);
// router.use('/api/v1/orders', proxyToOrderService);

export { router as routes };
