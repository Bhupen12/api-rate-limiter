import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();

router.post('/signup', AuthController.signup);

router.post('/login', AuthController.login);

router.get('/profile', authMiddleware, AuthController.getProfile);

export { router as authRoutes };
