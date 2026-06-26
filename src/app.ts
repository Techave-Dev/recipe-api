import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { errorHandler } from './middlewares/errorHandler';
import authRouter from './routes/auth.routes';
import ingredientRouter from './routes/ingredient.routes';
import recipeRouter from './routes/recipe.routes';
import tagRouter from './routes/tag.routes';
import userRouter from './routes/user.routes';

export function createApp(): Express {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  app.use('/auth', authRouter);
  app.use('/users', userRouter);
  app.use('/recipes', recipeRouter);
  app.use('/', ingredientRouter);
  app.use('/', tagRouter);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not Found' } });
  });

  app.use(errorHandler);

  return app;
}
