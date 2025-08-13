import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  host: 'localhost',
  port: 5433,
  user: 'postgres',
  password: '0000',
  database: 'api_gateway',
});

export const db = drizzle(pool, { schema });
