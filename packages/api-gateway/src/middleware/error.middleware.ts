import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.utils';

export interface AppError extends Error {
  statusCode?: number;
  status?: string;
}

export const errorMiddleware = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  logger.error(`Error ${err.statusCode}: ${err.message}`, {
    statusCode: err.statusCode,
    status: err.status,
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
