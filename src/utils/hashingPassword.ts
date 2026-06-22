import bcrypt from 'bcrypt';

const saltRounds = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, saltRounds);
}

export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}