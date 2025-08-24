export const REDIS_KEY_PREFIX = 'leaky-bucket:';

export const REDIS_RATE_LIMIT = {
  apiKeyPrefix: `${REDIS_KEY_PREFIX}rate-limit:config:`,
  tokenBucketPrefix: `${REDIS_KEY_PREFIX}rate-limit:bucket:`,
  adminRatePrefix: `${REDIS_KEY_PREFIX}admin-rate-limit:`,
};

// Geo-blocking keys
export const REDIS_GEO_BLOCK_KEY = {
  ipWhitelist: `${REDIS_KEY_PREFIX}geo:whitelist:ips`,
  ipBlacklist: `${REDIS_KEY_PREFIX}geo:blocklist:ips`,
  cidrBlacklist: `${REDIS_KEY_PREFIX}geo:blocklist:cidrs`,
  countryBlocklist: `${REDIS_KEY_PREFIX}geo:blocklist:countries`,
  countryAllowlist: `${REDIS_KEY_PREFIX}geo:allowlist:countries`,
  reputationPrefix: `${REDIS_KEY_PREFIX}geo:reputation:`,
  lockKeyPrefix: `${REDIS_KEY_PREFIX}geo:lock:`,
};
