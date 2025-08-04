import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { authRoutes } from './auth.routes';

const router: Router = Router();

// Mount routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// API Gateway proxy routes would go here
// router.use('/api/v1/users', proxyToUserService);
// router.use('/api/v1/orders', proxyToOrderService);

export { router as routes };
