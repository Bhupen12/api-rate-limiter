export const DEFAULT_RATE_LIMIT = {
  capacity: 100,
  refillRate: 10,
  keyPrefix: 'rate_limit',
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  tokensPerRequest: 1,
} as const;

export enum RateLimitKeyType {
  ApiKey = 'api_key',
  UserId = 'user_id',
  Ip = 'ip',
}
