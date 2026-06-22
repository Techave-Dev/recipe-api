import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import authRouter from './routes/auth.routes';
import userRouter from './routes/user.routes';
import { errorHandler } from './middlewares/errorHandler';

export function createApp(): Express {
  const app = express();
  app.use(express.json());
  
  app.use('/auth', authRouter);
  app.use('/users', userRouter);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not Found' } });
  });

  app.use(errorHandler);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const e = err as { status?: number; code?: string; message?: string };
    res.status(e.status ?? 500).json({
      error: { code: e.code ?? 'INTERNAL', message: e.message ?? 'Internal Server Error' },
    });
  });

  return app;
}
