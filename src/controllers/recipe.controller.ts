import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '../middlewares/auth';
import type { Difficulty } from '../repositories/recipe.repository';
import RecipeService from '../services/recipe.service';
import { ValidationError } from '../utils/error';
import { validateCreateRecipe, validateRecipeQuery } from '../validators/recipe.validator';

const recipeService = new RecipeService();

export async function createRecipe(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const validateBody = validateCreateRecipe(req.body);
    const authorId = req.user!.id;
    const recipe = await recipeService.create({
      ...validateBody,
      description: validateBody.description ?? null,
      authorId,
    });

    res.status(201).json({ recipe });
  } catch (err) {
    next(err);
  }
}

export async function getAllRecipes(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    validateRecipeQuery(req.query);
    const query = req.query as Record<string, string | string[] | undefined>;
    const result = await recipeService.getRecipes(query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getRecipeById(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      throw new ValidationError('Invalid ID format');
    }

    const recipeDetail = await recipeService.getRecipeById(id);

    res.status(200).json({
      recipe: {
        id: recipeDetail.id,
        title: recipeDetail.title,
        description: recipeDetail.description,
        cookingTime: recipeDetail.cookingTime,
        difficulty: recipeDetail.difficulty,
        authorId: recipeDetail.authorId,
        createdAt: recipeDetail.createdAt,
      },
      ingredients: recipeDetail.ingredients,
      tags: recipeDetail.tags,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateRecipe(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const currentUserId = req.user!.id;

    const title = typeof req.body.title === 'string' ? req.body.title : undefined;
    const description = typeof req.body.description === 'string' ? req.body.description : undefined;
    const cookingTime = req.body.cookingTime ? Number(req.body.cookingTime) : undefined;
    const difficulty = ['easy', 'medium', 'hard'].includes(req.body.difficulty)
      ? (req.body.difficulty as Difficulty)
      : undefined;

    const updateData = {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(cookingTime !== undefined && { cookingTime }),
      ...(difficulty !== undefined && { difficulty }),
    };

    const recipe = await recipeService.updateRecipe(id, currentUserId, updateData);

    res.status(200).json({ recipe });
  } catch (err) {
    next(err);
  }
}

export async function deleteRecipe(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const currentUserId = req.user!.id;

    await recipeService.deleteRecipe(id, currentUserId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
