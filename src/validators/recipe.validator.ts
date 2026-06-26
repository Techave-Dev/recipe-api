import type { Difficulty } from '../repositories/recipe.repository';
import { ValidationError } from '../utils/error';

export interface CreateRecipeInput {
  title: string;
  description?: string;
  cookingTime: number;
  difficulty: Difficulty;
}

export interface RecipeQueryInput {
  page?: string;
  limit?: string;
  difficulty?: string;
  cookingTimeMax?: string;
  sort?: string;
}

export function validateCreateRecipe(body: unknown): CreateRecipeInput {
  const details: { path: string; message: string }[] = [];
  const b = body as Partial<CreateRecipeInput> | null;

  if (!b || typeof b !== 'object') {
    throw new ValidationError('Invalid request body');
  }

  if (!b.title || b.title.trim().length === 0) {
    details.push({ path: 'title', message: 'Title is required' });
  }

  if (b.cookingTime === undefined || b.cookingTime === null) {
    details.push({ path: 'cookingTime', message: 'Cooking time is required' });
  } else {
    const time = Number(b.cookingTime);
    if (isNaN(time) || !Number.isInteger(time) || time < 1) {
      details.push({
        path: 'cookingTime',
        message: 'Cooking time must be an integer greater than or equal to 1',
      });
    }
  }

  const allowedDifficulties: Difficulty[] = ['easy', 'medium', 'hard'];
  if (!b.difficulty || !allowedDifficulties.includes(b.difficulty!)) {
    details.push({
      path: 'difficulty',
      message: 'Difficulty must be easy, medium, or hard',
    });
  }

  if (details.length > 0) {
    throw new ValidationError('Validation failed', details);
  }

  return {
    title: b.title!,
    description: b.description ?? '',
    cookingTime: Number(b.cookingTime),
    difficulty: b.difficulty!,
  };
}

export function validateRecipeQuery(query: unknown): void {
  const details: { path: string; message: string }[] = [];
  const q = query as RecipeQueryInput | null;

  if (!q || typeof q !== 'object') return;

  if (q.page && (isNaN(Number(q.page)) || Number(q.page) <= 0)) {
    details.push({ path: 'page', message: 'Page must be a positive integer' });
  }

  if (q.limit && (isNaN(Number(q.limit)) || Number(q.limit) > 100 || Number(q.limit) <= 0)) {
    details.push({ path: 'limit', message: 'Limit must be an integer between 1 and 100' });
  }

  if (q.difficulty && !['easy', 'medium', 'hard'].includes(q.difficulty)) {
    details.push({ path: 'difficulty', message: 'Difficulty must be easy, medium, or hard' });
  }

  if (q.cookingTimeMax && isNaN(Number(q.cookingTimeMax))) {
    details.push({ path: 'cookingTimeMax', message: 'cookingTimeMax must be a valid number' });
  }

  if (q.sort) {
    const [field] = String(q.sort).split(':');
    if (field !== 'cookingTime' && field !== 'createdAt' && field !== 'created_at') {
      details.push({ path: 'sort', message: 'Invalid sort field' });
    }
  }

  if (details.length > 0) {
    throw new ValidationError('Validation failed', details);
  }
}
