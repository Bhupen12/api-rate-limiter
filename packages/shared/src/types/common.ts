import { Request } from 'express';
import { PublicUserDTO } from './dto/user.dto';

export type UserRole = 'admin' | 'viewer' | 'editor' | 'moderator';

export interface AuthenticatedRequest extends Request {
  user?: PublicUserDTO;
}
