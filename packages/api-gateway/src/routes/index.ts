import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { authRoutes } from './auth.routes';
import { protectedRoutes } from './protected.routes';
import { adminRouter } from './admin';

const router: Router = Router();

// Mount routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/protected', protectedRoutes);

// Admin namespace
router.use('/admin', adminRouter);

export { router as routes };
