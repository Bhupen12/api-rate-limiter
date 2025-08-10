import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { authRoutes } from './auth.routes';
import { protectedRoutes } from './protected.routes';
import { rateLimitRoutes } from './rate-limiter.routes';
import { redisMiddleware } from '../middleware/redis.middleware';

const router: Router = Router();

// Mount routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/protected', protectedRoutes);
router.use('/rate-limits', redisMiddleware, rateLimitRoutes);

// API Gateway proxy routes would go here
// router.use('/api/v1/users', proxyToUserService);
// router.use('/api/v1/orders', proxyToOrderService);

export { router as routes };
