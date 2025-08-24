import dotenv from 'dotenv';
import path from 'path';
dotenv.config();

dotenv.config({
  path: path.resolve(__dirname, '../../../.env'),
});

export const config = {
  db: {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    name: process.env.DB_NAME!,
    ssl: process.env.DB_SSL!,
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || 'localhost',
    jwt: process.env.JWT_SECRET!,
  },
  ratelimit: {
    defaultCapacity: parseInt(process.env.DEFAULT_CAPACITY || '60', 10), // tokens
    defaultRefillTokens: parseInt(process.env.DEFAULT_REFILL_TOKENS || '1', 10), // per interval
    defaultRefillInterval: parseInt(
      process.env.DEFAULT_REFILL_INTERVAL || '1',
      10
    ), // in seconds
    adminRateLimit: parseInt(process.env.ADMIN_RATE_LIMIT || '200', 10), // requests
    adminRateWindow: parseInt(process.env.ADMIN_RATE_WINDOW || '3600', 10), // in seconds
  },
  reputation: {
    cacheTtl: parseInt(process.env.REPUTATION_CACHE_TTL || '3600', 10), // seconds
    lockTtl: parseInt(process.env.REPUTATION_LOCK_TTL || '10', 10), // seconds
    blockThreshold: parseInt(
      process.env.REPUTATION_BLOCK_THRESHOLD || '50',
      10
    ), // percentage
    maxAgeInDays: parseInt(process.env.REPUTATION_MAX_AGE || '30', 10), // days
    ipqualityscore: {
      apiKey: process.env.IPQS_API_KEY!,
      baseUrl:
        process.env.IPQS_API_URL || 'https://ipqualityscore.com/api/json/ip',
    },
    abuseipdb: {
      apiKey: process.env.ABUSE_IP_DB_API_KEY!,
      baseUrl:
        process.env.ABUSE_IP_DB_URL || 'https://api.abuseipdb.com/api/v2/check',
    },
  },
};
