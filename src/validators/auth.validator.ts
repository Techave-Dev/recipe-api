import { ValidationError } from '../utils/error';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export function validateRegister(body: unknown): RegisterInput {
  const details: { path: string; message: string }[] = [];
  const b = body as Partial<RegisterInput> | null;

  if (!b || typeof b !== 'object') {
    throw new ValidationError('Invalid request body');
  }

  if (!b.email || !EMAIL_REGEX.test(b.email)) {
    details.push({ path: 'email', message: 'Invalid email' });
  }
  if (!b.password || b.password.length < 8) {
    details.push({ path: 'password', message: 'Password must be at least 8 characters' });
  }
  if (!b.name || b.name.trim().length === 0) {
    details.push({ path: 'name', message: 'Name is required' });
  }

  if (details.length > 0) {
    throw new ValidationError('Validation failed', details);
  }

  return { email: b.email!, password: b.password!, name: b.name! };
}

export function validateLogin(body: unknown): LoginInput {
  const details: { path: string; message: string }[] = [];
  const b = body as Partial<LoginInput> | null;

  if (!b || typeof b !== 'object') {
    throw new ValidationError('Invalid request body');
  }

  if (!b.email || !EMAIL_REGEX.test(b.email)) {
    details.push({ path: 'email', message: 'Invalid email' });
  }
  if (!b.password) {
    details.push({ path: 'password', message: 'Password is required' });
  }

  if (details.length > 0) {
    throw new ValidationError('Validation failed', details);
  }

  return { email: b.email!, password: b.password! };
}