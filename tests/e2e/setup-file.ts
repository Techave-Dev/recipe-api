import { afterAll, beforeAll } from 'vitest';
import { closePool, truncateAll } from './db';

beforeAll(async () => {
  await truncateAll();
});

afterAll(async () => {
  await closePool();
});
