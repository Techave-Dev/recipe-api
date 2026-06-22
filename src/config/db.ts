import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL was not found!');
}

export const db = new Pool({
  connectionString: databaseUrl,
});