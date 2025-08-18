export const REDIS_KEY_PREFIX = 'leaky-bucket:';

export const REDIS_RATE_LIMIT = {
  user: `${REDIS_KEY_PREFIX}rate-limit:user`,
  userWindow: `${REDIS_KEY_PREFIX}rate-limit:user-window`,
  global: `${REDIS_KEY_PREFIX}rate-limit:global`,
  globalWindow: `${REDIS_KEY_PREFIX}rate-limit:global-window`,
  ip: `${REDIS_KEY_PREFIX}rate-limit:ip`,
  ipWindow: `${REDIS_KEY_PREFIX}rate-limit:ip-window`,
  cloudflareIp: `${REDIS_KEY_PREFIX}rate-limit:cloudflare-ip`,
  cloudflareIpWindow: `${REDIS_KEY_PREFIX}rate-limit:cloudflare-ip-window`,
  userAgent: `${REDIS_KEY_PREFIX}rate-limit:user-agent`,
  userAgentWindow: `${REDIS_KEY_PREFIX}rate-limit:user-agent-window`,
};

// Geo-blocking keys
export const REDIS_GEO_BLOCK_KEY = {
  ipWhitelist: `${REDIS_KEY_PREFIX}geo:whitelist:ips`,
  ipBlacklist: `${REDIS_KEY_PREFIX}geo:blocklist:ips`,
  countryBlocklist: `${REDIS_KEY_PREFIX}geo:blocklist:countries`,
  countryAllowlist: `${REDIS_KEY_PREFIX}geo:allowlist:countries`,
  reputationPrefix: `${REDIS_KEY_PREFIX}geo:reputation:`,
};
