import jwt from 'jsonwebtoken';

export interface JWTPayload {
  sub: string;
  email: string;
}

const jwtSecret = process.env.JWT_SECRET;

export function signToken(payload: JWTPayload): string {
  if (!jwtSecret) {
    throw new Error('Missing required env: JWT_SECRET');
  }

  return jwt.sign(payload, jwtSecret, { expiresIn: '7d' });
}

export function verifyToken(token: string) : JWTPayload {
  if (!jwtSecret) {
    throw new Error('Missing required env: JWT_SECRET');
  }

  return jwt.verify(token, jwtSecret) as JWTPayload;
}