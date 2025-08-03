import { Router } from 'express';
import { healthRoutes } from './health.routes';

const router: Router = Router();

// Mount routes
router.use('/health', healthRoutes);

// API Gateway proxy routes would go here
// router.use('/api/v1/users', proxyToUserService);
// router.use('/api/v1/orders', proxyToOrderService);

export { router as routes };
