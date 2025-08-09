import type { Redis } from 'ioredis';

declare module 'express-serve-static-core' {
  interface Request {
    redis: Redis;
  }
}
