import { PublicUserDTO } from './user.dto';
import { UserRole } from '../common';

export interface LoginRequestDTO {
  email: string;
  password: string;
}

export interface LoginResponseDTO {
  user: PublicUserDTO;
  token: string;
  expiresIn: number;
}

export interface SignupRequestDTO {
  email: string;
  password: string;
  username: string;
  role?: UserRole;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}
