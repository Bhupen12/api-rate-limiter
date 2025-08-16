import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { config as DB_CONFIG } from '../config';

const pool = new Pool({
  host: DB_CONFIG.db.host,
  port: DB_CONFIG.db.port,
  user: DB_CONFIG.db.user,
  password: DB_CONFIG.db.password,
  database: DB_CONFIG.db.name,
  ssl: DB_CONFIG.db.ssl === 'true' ? { rejectUnauthorized: false } : false,
});

const db = drizzle(pool);

async function main() {
  console.log('Migration started');
  try {
    await migrate(db, {
      migrationsFolder: './drizzle',
    });
    console.log('Migration completed');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
