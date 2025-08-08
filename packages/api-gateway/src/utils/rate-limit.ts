export function makeRateLimitKey(
  prefix: string,
  type: 'api_key' | 'user_id' | 'ip',
  identifier: string
) {
  return `${prefix}:${type}:${identifier}`;
}
