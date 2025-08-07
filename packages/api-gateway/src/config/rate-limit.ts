import { DEFAULT_RATE_LIMIT } from '../constants/rate-limit.constants';
import type { RateLimitConfig } from '../interfaces/rate-limit.interface';

export function getRateLimitConfig(
  overrides: RateLimitConfig = {}
): Required<Omit<RateLimitConfig, 'keyPrefix'>> &
  Pick<RateLimitConfig, 'keyPrefix'> {
  return { ...DEFAULT_RATE_LIMIT, ...overrides };
}
