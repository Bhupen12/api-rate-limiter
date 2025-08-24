import type { Redis } from 'ioredis';

declare global {
  namespace Express {
    interface Request {
      redis: Redis;
      clientIp?: string;
    }
  }
}

export {};
