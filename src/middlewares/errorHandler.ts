import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/error';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  console.error(err);
  return res.status(500).json({
    error: { code: 'INTERNAL', message: 'Internal server error' },
  });
}
