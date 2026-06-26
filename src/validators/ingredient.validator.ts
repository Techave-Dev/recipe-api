import { ValidationError } from '../utils/error';

export interface IngredientInput {
  name: string;
  quantity: string;
}

export function validateIngredient(body: unknown): IngredientInput {
  const details: { path: string; message: string }[] = [];
  const b = body as Partial<IngredientInput> | null;

  if (!b || typeof b !== 'object') {
    throw new ValidationError('Invalid request body');
  }

  if (!b.name || b.name.trim().length === 0) {
    details.push({ path: 'name', message: 'Ingredient name is required' });
  }

  if (!b.quantity || b.quantity.trim().length === 0) {
    details.push({ path: 'quantity', message: 'Quantity description is required' });
  }

  if (details.length > 0) {
    throw new ValidationError('Validation failed', details);
  }

  return {
    name: b.name!,
    quantity: b.quantity!,
  };
}
