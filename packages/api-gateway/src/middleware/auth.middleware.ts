import { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  ApiResponse,
  AuthenticatedRequest,
  JwtPayload,
  User,
} from '@monorepo/shared';
import { logger } from '../utils/logger';

// Mock user data (same as in controller)
const MOCK_USERS: User[] = [
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

/**
 * Middleware to authenticate JWT tokens
 */
export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: 'Authorization Header Required',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Token is required',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET environment variable is not set');
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    const decode = jwt.verify(token, jwtSecret) as JwtPayload;

    const user = MOCK_USERS.find((u) => u.id === decode.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    req.user = user;
    logger.debug(`User ${user.email} authenticated successfully`);
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.error('Invalid JWT token:', error.message);
      res.status(500).json({
        success: false,
        error: 'Invalid token',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (error instanceof jwt.TokenExpiredError) {
      logger.error(`JWT has been Expired`, error.message);
      res.status(500).json({
        success: false,
        error: 'Token expired',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    logger.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};
