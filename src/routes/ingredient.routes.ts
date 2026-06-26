import { Router } from 'express';
import {
  addIngredient,
  deleteIngredient,
  getIngredients,
  updateIngredient,
} from '../controllers/ingredient.controller';
import { requireAuth } from '../middlewares/auth';

const ingredientRouter = Router();

ingredientRouter.post('/recipes/:recipeId/ingredients', requireAuth, addIngredient);
ingredientRouter.get('/recipes/:recipeId/ingredients', getIngredients);
ingredientRouter.patch('/ingredients/:id', requireAuth, updateIngredient);
ingredientRouter.delete('/ingredients/:id', requireAuth, deleteIngredient);

export default ingredientRouter;
