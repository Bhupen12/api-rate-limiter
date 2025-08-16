import type { Config } from 'drizzle-kit';
import { config as DB_CONFIG } from './src/config';

export default {
  schema: './src/db/schema/*',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: DB_CONFIG.db.host,
    port: DB_CONFIG.db.port,
    user: DB_CONFIG.db.user,
    password: DB_CONFIG.db.password,
    database: DB_CONFIG.db.name,
    ssl: DB_CONFIG.db.ssl === 'true' ? { rejectUnauthorized: false } : false,
  },
} satisfies Config;
