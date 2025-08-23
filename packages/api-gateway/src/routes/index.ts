import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { authRoutes } from './auth.routes';
import { protectedRoutes } from './protected.routes';
import { rateLimiterMiddleware } from '../middleware/rate-limiter.middleware';
import { adminRouter } from './admin';

const router: Router = Router();

// Mount routes
router.use('/health', healthRoutes);
router.use('/auth', rateLimiterMiddleware, authRoutes);
router.use('/protected', rateLimiterMiddleware, protectedRoutes);

// Admin namespace
router.use('/admin', adminRouter);

export { router as routes };
