const DEFAULT_CAPACITY = '100';
const DEFAULT_REFILL_RATE = '10';
const DEFAULT_KEY_PREFIX = 'rate_limit';

export const DEFAULT_RATE_LIMIT = {
  capacity: parseInt(process.env.RATE_LIMIT_CAPACITY || DEFAULT_CAPACITY, 10),
  refillRate: parseInt(
    process.env.RATE_LIMIT_REFILL_RATE || DEFAULT_REFILL_RATE,
    10
  ),
  keyPrefix: DEFAULT_KEY_PREFIX,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  tokensPerRequest: 1,
} as const;

export const RATE_LIMIT_CONFIG_KEY = 'rate_limit_config';

export enum RateLimitKeyType {
  ApiKey = 'api_key',
  UserId = 'user_id',
  Ip = 'ip',
}
