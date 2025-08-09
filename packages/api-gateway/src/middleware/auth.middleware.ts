import { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  ApiResponse,
  AuthenticatedRequest,
  JwtPayload,
} from '@monorepo/shared';
import { logger } from '../utils/logger';
import { MOCK_USERS } from '../constants/auth.constants';
import { API_RESPONSES } from '../constants';

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
        error: API_RESPONSES.AUTH_ERRORS.AUTH_HEADER_REQUIRED,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      res.status(401).json({
        success: false,
        error: API_RESPONSES.AUTH_ERRORS.TOKEN_REQUIRED,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET environment variable is not set');
      res.status(500).json({
        success: false,
        error: API_RESPONSES.SYSTEM_ERRORS.INTERNAL_SERVER_ERROR,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    const decode = jwt.verify(token, jwtSecret) as JwtPayload;

    const user = MOCK_USERS.find((u) => u.id === decode.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        error: API_RESPONSES.USER_ERRORS.USER_NOT_FOUND,
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
        error: API_RESPONSES.AUTH_ERRORS.INVALID_TOKEN,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (error instanceof jwt.TokenExpiredError) {
      logger.error(`JWT has been Expired`, error.message);
      res.status(500).json({
        success: false,
        error: API_RESPONSES.AUTH_ERRORS.TOKEN_EXPIRED,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    logger.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: API_RESPONSES.SYSTEM_ERRORS.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};
