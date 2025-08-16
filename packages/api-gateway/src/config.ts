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
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || 'localhost',
  },
};
