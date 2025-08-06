import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  User,
} from '@monorepo/shared';
import { logger } from '../utils/logger';

const MOCK_USER: User[] = [
  {
    id: '1',
    email: 'admin@example.com',
    username: 'admin',
    role: 'admin',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    email: 'viewer@example.com',
    username: 'viewer',
    role: 'viewer',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '3',
    email: 'editor@example.com',
    username: 'editor',
    role: 'editor',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '4',
    email: 'moderator@example.com',
    username: 'moderator',
    role: 'moderator',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

const MOCK_PASSWORDS: Record<string, string> = {
  'admin@example.com': 'admin123',
  'viewer@example.com': 'viewer123',
  'editor@example.com': 'editor123',
  'moderator@example.com': 'moderator123',
};

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password }: LoginRequest = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email and Password are required',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const user = MOCK_USER.find((u) => u.email === email);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid Credentials',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const expectedPassword = MOCK_PASSWORDS[email];
      if (password !== expectedPassword) {
        res.status(401).json({
          success: false,
          error: 'Invalid Credentials',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        logger.error('JWT_SECRET environment variable is not set');
        res.status(500).json({
          success: false,
          error: 'Internal Server Error',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const expiresIn = 24 * 60 * 60;
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        jwtSecret,
        { expiresIn }
      );

      const response: LoginResponse = {
        user,
        token,
        expiresIn,
      };

      // Log successful login with rate limit info
      logger.info('User login successful', {
        email: user.email,
        role: user.role,
        rateLimitInfo: {
          limit: res.get('X-RateLimit-Limit'),
          remaining: res.get('X-RateLimit-Remaining'),
          reset: res.get('X-RateLimit-Reset'),
        },
      });

      res.status(200).json({
        success: true,
        data: response,
        message: 'Login Successful',
        timestamp: new Date().toISOString(),
      } as ApiResponse<LoginResponse>);
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      // req.user is available from auth middleware
      // Rate limiting was applied using req.user.id
      const user = (req as any).user as User;
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      logger.info('Profile accessed', {
        userId: user.id,
        email: user.email,
        role: user.role,
        rateLimitInfo: {
          limit: res.get('X-RateLimit-Limit'),
          remaining: res.get('X-RateLimit-Remaining'),
          reset: res.get('X-RateLimit-Reset'),
        },
      });

      res.status(200).json({
        success: true,
        data: user,
        message: 'Profile retrieved successfully',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }
}
