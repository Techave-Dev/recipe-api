import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  pool = new Pool({ connectionString: url });
  return pool;
}

const TABLES = ['recipe_tags', 'ingredients', 'tags', 'recipes', 'users'] as const;

export async function truncateAll(): Promise<void> {
  const sql = `TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`;
  const client = await getPool().connect();
  try {
    await client.query(sql);
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (!pool) return;
  await pool.end();
  pool = null;
}
