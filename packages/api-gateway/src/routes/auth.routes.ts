import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { authRateLimiterMiddleware } from '../middleware/rate-limiter';

const router: Router = Router();

router.use(authRateLimiterMiddleware);

router.post('/signup', AuthController.signup);

router.post('/login', AuthController.login);

router.get('/profile', authMiddleware, AuthController.getProfile);

export { router as authRoutes };
