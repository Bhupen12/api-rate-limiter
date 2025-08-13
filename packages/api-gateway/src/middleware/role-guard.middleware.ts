import { Response, NextFunction } from 'express';
import { ApiResponse, AuthenticatedRequest, UserRole } from '@monorepo/shared';
import { logger } from '../utils/logger.utils';
import { API_RESPONSES } from '../constants';
import { RoleService } from '../services/role.service';

export const requireRole = (requiredRole: UserRole) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
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

      const [userRole, requiredRoleObj] = await Promise.all([
        RoleService.findRoleByName(user.role),
        RoleService.findRoleByName(requiredRole),
      ]);
      if (!userRole || !requiredRoleObj) {
        res.status(500).json({
          success: false,
          error: API_RESPONSES.USER_ERRORS.ROLE_NOT_FOUND,
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const userRoleLevel = userRole.hierarchyLevel;
      const requiredRoleLevel = requiredRoleObj.hierarchyLevel;

      if (userRoleLevel < requiredRoleLevel) {
        logger.warn(
          `User ${user.email} (${user.role}) attempted to access ${requiredRole} resource`
        );
        res.status(403).json({
          success: false,
          error: `Insufficient permission. Required role: ${requiredRole}`,
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
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
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
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

      const [userRole, requiredRoleObjects] = await Promise.all([
        RoleService.findRoleByName(user.role),
        Promise.all(
          requiredRoles.map((role) => RoleService.findRoleByName(role))
        ),
      ]);

      if (!userRole || requiredRoleObjects.some((r) => !r)) {
        res.status(500).json({
          success: false,
          error: API_RESPONSES.USER_ERRORS.ROLE_NOT_FOUND,
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const userRoleLevel = userRole.hierarchyLevel;
      const minRequiredLevel = Math.min(
        ...requiredRoleObjects.map((r) => r!.hierarchyLevel)
      );

      if (userRoleLevel < minRequiredLevel) {
        logger.warn(
          `User ${user.email} (${user.role}) attempted to access resource requiring roles: ${requiredRoles.join(', ')}`
        );
        res.status(403).json({
          success: false,
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
