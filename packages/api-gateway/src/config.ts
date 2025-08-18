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
  ipqualityscore: {
    apiKey: process.env.ABUSE_IP_DB_API_KEY!,
    baseUrl:
      process.env.ABUSE_IP_DB_URL || 'https://api.abuseipdb.com/api/v2/check',
    maxAgeInDays: parseInt(process.env.ABUSE_IP_DB_MAX_AGE || '50', 10),
    reputationCacheTtl: parseInt(
      process.env.REPUTATION_CACHE_TTL || '3600',
      10
    ),
    reputationBlockThreshold: parseInt(
      process.env.REPUTATION_BLOCK_THRESHOLD || '50',
      10
    ),
  },
};
