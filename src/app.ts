import express, { type Express, type Request, type Response, type NextFunction } from 'express';

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `${req.method} ${req.path}` } });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const e = err as { status?: number; code?: string; message?: string };
    res.status(e.status ?? 500).json({
      error: { code: e.code ?? 'INTERNAL', message: e.message ?? 'Internal Server Error' },
    });
  });

  return app;
}
