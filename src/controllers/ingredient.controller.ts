import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '../middlewares/auth';
import IngredientService from '../services/ingredient.service';
import { validateIngredient } from '../validators/ingredient.validator';

const ingredientService = new IngredientService();

export async function addIngredient(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const validateBody = validateIngredient(req.body);
    const ingredient = await ingredientService.addIngredient(
      Number(req.params.recipeId),
      req.user!.id,
      validateBody.name,
      validateBody.quantity,
    );

    res.status(201).json({ ingredient });
  } catch (err) {
    next(err);
  }
}

export async function getIngredients(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await ingredientService.getIngredientByRecipe(Number(req.params.recipeId));
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function updateIngredient(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;
    const name = typeof req.body.name === 'string' ? req.body.name : undefined;
    const quantity = typeof req.body.quantity === 'string' ? req.body.quantity : undefined;
    const ingredient = await ingredientService.updateIngredient(id, userId, { name, quantity });
    res.status(200).json({ ingredient });
  } catch (err) {
    next(err);
  }
}

export async function deleteIngredient(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await ingredientService.deleteIngredient(Number(req.params.id), req.user!.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
