import { Router } from 'express';
import {
  attachTag,
  createTag,
  detachTag,
  getRecipesByTag,
  getTags,
} from '../controllers/tag.controller';
import { requireAuth } from '../middlewares/auth';

const tagRouter = Router();

tagRouter.post('/tags', requireAuth, createTag);
tagRouter.get('/tags', getTags);
tagRouter.post('/recipes/:recipeId/tags', requireAuth, attachTag);
tagRouter.delete('/recipes/:recipeId/tags/:tagId', requireAuth, detachTag);
tagRouter.get('/tags/:slug/recipes', getRecipesByTag);

export default tagRouter;
