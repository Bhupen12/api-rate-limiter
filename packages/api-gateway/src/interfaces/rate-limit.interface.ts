import { RateLimitKeyType } from '../constants/rate-limit.constants';

export interface RateLimitConfig {
  capacity?: number;
  refillRate?: number;
  keyPrefix?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  tokensPerRequest?: number;
}

export interface BucketInfo {
  currentTokens: number;
  capacity: number;
  refillRate: number;
  timeUntilNextToken: number;
  isRateLimited: boolean;
}

export type RateLimitKeyTypeUnion =
  | RateLimitKeyType.ApiKey
  | RateLimitKeyType.UserId
  | RateLimitKeyType.Ip;
