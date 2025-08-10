import { Response, NextFunction } from 'express';
import { ApiResponse, AuthenticatedRequest, UserRole } from '@monorepo/shared';
import { logger } from '../utils/logger.utils';
import { API_RESPONSES } from '../constants';
import { ROLE_HIERARCHY } from '../constants/role.constants';

export const requireRole = (requiredRole: UserRole) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({
          success: false,
          error: API_RESPONSES.AUTH_ERRORS.AUTHENTICATION_REQUIRED,
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const userRoleLevel = ROLE_HIERARCHY[user.role];
      const requiredRoleLevel = ROLE_HIERARCHY[requiredRole];

      if (userRoleLevel < requiredRoleLevel) {
        logger.warn(
          `User ${user.email} (${user.role}) attempt to access ${requiredRole} resource`
        );
        res.status(403).json({
          success: false,
          data: `Insufficient Permission. Required Role: ${requiredRole}`,
        } as ApiResponse);
      }

      logger.debug(
        `User ${user.email} (${user.role}) authorized for ${requiredRole} resource`
      );
      next();
    } catch (error) {
      logger.error('Role guard error:', error);
      res.status(500).json({
        success: false,
        error: API_RESPONSES.SYSTEM_ERRORS.INTERNAL_SERVER_ERROR,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  };
};

export const requireAnyRole = (requiredRoles: UserRole[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({
          success: false,
          error: API_RESPONSES.AUTH_ERRORS.AUTHENTICATION_REQUIRED,
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const userRoleLevel = ROLE_HIERARCHY[user.role];
      const hasRequiredRole = requiredRoles.some((role) => {
        const requiredRoleLevel = ROLE_HIERARCHY[role];
        return userRoleLevel >= requiredRoleLevel;
      });
      if (!hasRequiredRole) {
        logger.warn(
          `User ${user.email} (${user.role}) attempted to access resource requiring roles: ${requiredRoles.join(', ')}`
        );
        res.status(403).json({
          success: true,
          error: `Insufficient permissions. Required roles: ${requiredRoles.join(', ')}`,
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      logger.debug(
        `User ${user.email} (${user.role}) authorized for resource requiring roles: ${requiredRoles.join(', ')}`
      );
      next();
    } catch (error) {
      logger.error(`Role guard error:`, error);
      res.status(500).json({
        success: false,
        error: API_RESPONSES.SYSTEM_ERRORS.INTERNAL_SERVER_ERROR,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  };
};

export const requireAdmin = requireRole('admin');
export const requireEditor = requireRole('editor');
export const requireModerator = requireRole('moderator');
export const requireViewer = requireRole('viewer');
