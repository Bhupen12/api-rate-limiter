import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { protectedRoutes } from './protected.routes';
import { adminRouter } from './admin';
import { ipRateLimiterMiddleware } from '../middleware/rate-limiter/ip.middleware';
import { apiKeyRateLimiterMiddleware } from '../middleware/rate-limiter/apikey..middleware';
import { adminRateLimiterMiddleware } from '../middleware/rate-limiter/admin.middleware';

const router: Router = Router();

// Mount routes
router.use('/auth', ipRateLimiterMiddleware, authRoutes);
router.use('/protected', apiKeyRateLimiterMiddleware, protectedRoutes);

// Admin namespace
router.use('/admin', adminRateLimiterMiddleware, adminRouter);

export { router as routes };
