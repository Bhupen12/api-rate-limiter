export const RATE_LIMIT_ERRORS = {
  TOO_MANY_REQUESTS: 'Too many requests. Please try again later.',
  BUCKET_OVERFLOW: 'Bucket overflow. Requests are being throttled.',
  RATE_LIMITER_FAILED: 'Rate limiter internal error',
  RATE_LIMIT_API_KEY_MISSING: 'API key is missing',
};

export const GEO_BLOCK_ERRORS = {
  BLOCKED: 'Access denied based on geographic location or IP reputation',
  INVALID_COUNTRY: 'Invalid country code provided',
  INVALID_IP: 'Invalid IP address provided',
} as const;
