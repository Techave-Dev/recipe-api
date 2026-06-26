import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '../middlewares/auth';
import TagService from '../services/tag.service';
import { UnauthorizedError, ValidationError } from '../utils/error';
import { validateTag } from '../validators/tag.validator';

const tagService = new TagService();

export async function createTag(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const validateBody = validateTag(req.body);
    const tag = await tagService.createTag(validateBody.name, validateBody.slug);
    res.status(201).json({ tag });
  } catch (err) {
    next(err);
  }
}

export async function getTags(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await tagService.getAllTags();
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function attachTag(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tagId = req.body.tagId ? Number(req.body.tagId) : undefined;
    const slug = typeof req.body.slug === 'string' ? req.body.slug : undefined;
    const key = tagId ?? slug;

    if (!key) throw new ValidationError('tagId or slug required');
    if (!req.user?.id) throw new UnauthorizedError('Unauthorized');

    const tag = await tagService.attachTag(Number(req.params.recipeId), Number(req.user.id), key);
    res.status(201).json({ tag });
  } catch (err) {
    next(err);
  }
}

export async function detachTag(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await tagService.detachTag(Number(req.params.recipeId), req.user!.id, Number(req.params.tagId));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getRecipesByTag(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const slug = String(req.params.slug);
    const page = typeof req.query.page === 'string' ? req.query.page : undefined;
    const limit = typeof req.query.limit === 'string' ? req.query.limit : undefined;
    const queryDiff = req.query.difficulty;
    const difficulty =
      queryDiff === 'easy' || queryDiff === 'medium' || queryDiff === 'hard'
        ? queryDiff
        : undefined;
    const validateFilters = { page, limit, difficulty };
    const result = await tagService.getRecipesByTag(slug, validateFilters);

    res.status(200).json({
      tag: result.tag,
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
}
