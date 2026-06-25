import { afterAll, beforeEach } from 'vitest';
import { closePool, truncateAll } from './db';

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await closePool();
});
