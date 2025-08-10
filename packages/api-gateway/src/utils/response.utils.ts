import { Response } from 'express';

export function success<T>(res: Response, data: T, message?: string) {
  return res.status(200).json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  });
}

export function failure(res: Response, status: number, error: string) {
  return res.status(status).json({
    success: false,
    error,
    timestamp: new Date().toISOString(),
  });
}
