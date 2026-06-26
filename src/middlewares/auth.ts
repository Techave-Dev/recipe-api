import type { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../utils/error';
import { verifyToken } from '../utils/jwt';

export interface AuthRequest extends Request {
  user?: { id: number; email: string };
}

export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid Authorization header'));
  }

  const token = header.slice(7).trim();

  try {
    const payload = verifyToken(token);
    req.user = { id: Number(payload.sub), email: payload.email };
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}
