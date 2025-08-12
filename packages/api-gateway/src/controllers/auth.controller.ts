import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  User,
} from '@monorepo/shared';
import { logger } from '../utils/logger.utils';
import { API_RESPONSES } from '../constants';
import { UserService } from '../services/user.service';
import { RoleService } from 'src/services/role.service';

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password }: LoginRequest = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: API_RESPONSES.VALIDATION_ERRORS.EMAIL_PASSWORD_REQUIRED,
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const user = await UserService.findByEmail(email);
      if (!user) {
        res.status(401).json({
          success: false,
          error: API_RESPONSES.AUTH_ERRORS.INVALID_CREDENTIALS,
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const isPasswordValid = await UserService.verifyPassword(
        password,
        user.passwordHash
      );
      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          error: API_RESPONSES.AUTH_ERRORS.INVALID_CREDENTIALS,
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

      logger.info(`User ${user.email} logged in successfully`);

      res.status(200).json({
        success: true,
        data: response,
        message: API_RESPONSES.SUCCESS_MESSAGES.LOGIN_SUCCESS,
        timestamp: new Date().toISOString(),
      } as ApiResponse<LoginResponse>);
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: API_RESPONSES.SYSTEM_ERRORS.INTERNAL_SERVER_ERROR,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  static async signup(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, username, role } = req.body;

      if (!email || !password || !username) {
        res.status(400).json({
          success: false,
          error: API_RESPONSES.VALIDATION_ERRORS.INVALID_SIGNUP_DATA,
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const existingUser = await UserService.findByEmail(email);
      if (existingUser) {
        res.status(400).json({
          success: false,
          error: API_RESPONSES.USER_ERRORS.EMAIL_ALREADY_EXISTS,
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const viewerRole = await RoleService.findRoleByName(role || 'viewer');
      if (!viewerRole) {
        logger.error('Viewer role not found');
        res.status(500).json({
          success: false,
          error: API_RESPONSES.SYSTEM_ERRORS.INTERNAL_SERVER_ERROR,
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }

      const newUser = await UserService.createUser({
        email,
        password,
        username,
        roleId: viewerRole.id,
        isActive: true,
      });

      res.status(201).json({
        success: true,
        data: {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
        },
        message: API_RESPONSES.SUCCESS_MESSAGES.SIGNUP_SUCCESS,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      logger.error('Signup error:', error);
      res.status(500).json({
        success: false,
        error: API_RESPONSES.SYSTEM_ERRORS.INTERNAL_SERVER_ERROR,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }

  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user as User;
      if (!user) {
        res.status(401).json({
          success: false,
          error: API_RESPONSES.AUTH_ERRORS.UNAUTHORIZED,
          timestamp: new Date().toISOString(),
        } as ApiResponse);
        return;
      }
      res.status(200).json({
        success: true,
        data: user,
        message: API_RESPONSES.SUCCESS_MESSAGES.PROFILE_RETRIEVED,
        timestamp: new Date().toDateString(),
      } as ApiResponse<User>);
    } catch (error) {
      logger.error('Get Profile Error: ', error);
      res.status(500).json({
        success: false,
        error: API_RESPONSES.SYSTEM_ERRORS.INTERNAL_SERVER_ERROR,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }
}
