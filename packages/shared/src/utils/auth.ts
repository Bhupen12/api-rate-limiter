import { Request } from 'express';
import { AuthRequest } from '../types';

export function isAuthRequest(req: Request): req is AuthRequest {
  return 'user' in req;
}
