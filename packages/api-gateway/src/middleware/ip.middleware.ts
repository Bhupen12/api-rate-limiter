import { NextFunction, Request, Response } from 'express';
import { getClientIp } from '../utils/get-client-ip';

export const IPMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  req.clientIp = getClientIp(req) || 'undefined';
  next();
};
