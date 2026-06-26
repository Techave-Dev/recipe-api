import { ValidationError } from '../utils/error';

export interface TagInput {
  name: string;
  slug: string;
}

const SLUG_REGEX = /^[a-z0-9-]+$/;

export function validateTag(body: unknown): TagInput {
  const details: { path: string; message: string }[] = [];
  const b = body as Partial<TagInput> | null;

  if (!b || typeof b !== 'object') {
    throw new ValidationError('Invalid request body');
  }

  if (!b.name || b.name.trim().length === 0) {
    details.push({ path: 'name', message: 'Tag name is required' });
  }

  if (!b.slug || !SLUG_REGEX.test(b.slug)) {
    details.push({
      path: 'slug',
      message: 'Slug must be lowercase alphanumeric and dashes only',
    });
  }

  if (details.length > 0) {
    throw new ValidationError('Validation failed', details);
  }

  return {
    name: b.name!,
    slug: b.slug!,
  };
}
