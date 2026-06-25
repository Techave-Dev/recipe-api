import { closePool } from './db';

export default async function setup(): Promise<void> {
  await closePool();
}
