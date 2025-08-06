import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { createRateLimitMiddleware } from '../middleware/rate-limit.middleware';

const router: Router = Router();

const loginRateLimit = createRateLimitMiddleware({
  capacity: 5, // Only 5 login attempts
  refillRate: 0.5, // 1 attempt every 2 seconds
  keyPrefix: 'login_attempts',
});

router.post('/login', loginRateLimit, AuthController.login);

router.get('/profile', authMiddleware, AuthController.getProfile);

export { router as authRoutes };
