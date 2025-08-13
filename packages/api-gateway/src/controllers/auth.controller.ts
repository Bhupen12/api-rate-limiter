import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserService } from '../services/user.service';
import { RoleService } from '../services/role.service';
import { toPublicUserDTO } from '../services/mapper/user.mapper';
import type {
  AuthenticatedRequest,
  LoginRequestDTO,
  LoginResponseDTO,
  SignupRequestDTO,
  UserDTO,
} from '@monorepo/shared';
import { failure, success } from '../utils/response.utils';
import { API_RESPONSES } from '../constants';

export class AuthController {
  static async signup(req: Request, res: Response) {
    const { email, password, username, role }: SignupRequestDTO = req.body;

    if (!email || !password || !username) {
      return failure(res, 400, API_RESPONSES.VALIDATION_ERRORS.MISSING_FIELDS);
    }

    const existing = await UserService.findByEmail(email);
    if (existing) {
      return failure(res, 400, API_RESPONSES.USER_ERRORS.EMAIL_ALREADY_EXISTS);
    }

    const userRole = await RoleService.findRoleByName(role || 'viewer');
    if (!userRole) {
      return failure(res, 500, API_RESPONSES.USER_ERRORS.ROLE_NOT_FOUND);
    }

    const newUser = await UserService.createUser({
      email,
      password,
      username,
      roleId: userRole.id,
    });
    return success(
      res,
      toPublicUserDTO({ ...newUser, role: userRole.name }),
      API_RESPONSES.SUCCESS_MESSAGES.SIGNUP_SUCCESS
    );
  }

  static async login(req: Request, res: Response) {
    const { email, password }: LoginRequestDTO = req.body;

    const user = await UserService.findByEmail(email);
    if (!user) {
      return failure(res, 401, API_RESPONSES.AUTH_ERRORS.INVALID_CREDENTIALS);
    }

    const valid = await UserService.verifyPassword(password, user.passwordHash);
    if (!valid) {
      return failure(res, 401, API_RESPONSES.AUTH_ERRORS.INVALID_CREDENTIALS);
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      'nsbdyubsfdyuagfa',
      { expiresIn: '1d' }
    );

    const response: LoginResponseDTO = {
      user: toPublicUserDTO(user),
      token,
      expiresIn: 86400,
    };
    return success(res, response, API_RESPONSES.SUCCESS_MESSAGES.LOGIN_SUCCESS);
  }

  static async getProfile(req: Request, res: Response) {
    const { user } = req as AuthenticatedRequest;

    if (!user) {
      return failure(res, 401, API_RESPONSES.AUTH_ERRORS.UNAUTHORIZED);
    }

    const profile: UserDTO = {
      ...user,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return res.status(200).json({
      success: true,
      data: profile,
    });
  }
}
