import { describe, expect, it } from 'vitest';
import { app, authedReq, request, seedRecipe, seedTag, seedUser, uniq } from './helpers';

describe('POST /tags', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/tags').send({ name: 'Vegan', slug: uniq('vegan') });
    expect(res.status).toBe(401);
  });

  it('returns 201 on valid input', async () => {
    const { token } = await seedUser();
    const slug = uniq('vegan');
    const res = await authedReq(token).post('/tags').send({ name: 'Vegan', slug });
    expect(res.status).toBe(201);
    expect(res.body.tag).toMatchObject({ name: 'Vegan', slug });
  });

  it('returns 409 on duplicate slug', async () => {
    const { token } = await seedUser();
    const slug = uniq('vegan');
    await seedTag(token, { slug });
    const res = await authedReq(token).post('/tags').send({ name: 'Vegan2', slug });
    expect(res.status).toBe(409);
  });

  it('returns 400 on invalid slug', async () => {
    const { token } = await seedUser();
    const res = await authedReq(token).post('/tags').send({ name: 'X', slug: 'Has Spaces!' });
    expect(res.status).toBe(400);
  });

  it('returns 400 on empty slug', async () => {
    const { token } = await seedUser();
    const res = await authedReq(token).post('/tags').send({ name: 'X', slug: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /tags', () => {
  it('returns 200 with public list', async () => {
    const { token } = await seedUser();
    await seedTag(token, { name: 'Vegan', slug: uniq('vegan') });
    await seedTag(token, { name: 'Quick', slug: uniq('quick') });
    const res = await request(app).get('/tags');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});

describe('POST /recipes/:recipeId/tags', () => {
  it('attaches by tagId (201) by author', async () => {
    const { token } = await seedUser();
    const recipe = await seedRecipe(token);
    const tag = await seedTag(token, { slug: uniq('vegan') });

    const res = await authedReq(token).post(`/recipes/${recipe.id}/tags`).send({ tagId: tag.id });
    expect(res.status).toBe(201);
    expect(res.body.tag).toMatchObject({ id: tag.id });
  });

  it('returns 404 when slug does not exist (strict)', async () => {
    const { token } = await seedUser();
    const recipe = await seedRecipe(token);
    const res = await authedReq(token)
      .post(`/recipes/${recipe.id}/tags`)
      .send({ slug: 'nonexistent' });
    expect(res.status).toBe(404);
  });

  it('returns 403 by non-author', async () => {
    const { token: authorToken } = await seedUser({ email: `${uniq('author')}@b.com` });
    const { token } = await seedUser({ email: `${uniq('other')}@b.com` });
    const recipe = await seedRecipe(authorToken);
    const tag = await seedTag(authorToken, { slug: uniq('vegan') });

    const res = await authedReq(token).post(`/recipes/${recipe.id}/tags`).send({ tagId: tag.id });
    expect(res.status).toBe(403);
  });

  it('returns 409 on duplicate attach', async () => {
    const { token } = await seedUser();
    const recipe = await seedRecipe(token);
    const tag = await seedTag(token, { slug: uniq('vegan') });
    await authedReq(token).post(`/recipes/${recipe.id}/tags`).send({ tagId: tag.id });

    const res = await authedReq(token).post(`/recipes/${recipe.id}/tags`).send({ tagId: tag.id });
    expect(res.status).toBe(409);
  });

  it('returns 404 when attaching non-existent tagId', async () => {
    const { token } = await seedUser();
    const recipe = await seedRecipe(token);
    const res = await authedReq(token).post(`/recipes/${recipe.id}/tags`).send({ tagId: 99999 });
    expect(res.status).toBe(404);
  });

  it('returns 400 when body has neither tagId nor slug', async () => {
    const { token } = await seedUser();
    const recipe = await seedRecipe(token);
    const res = await authedReq(token).post(`/recipes/${recipe.id}/tags`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('DELETE /recipes/:recipeId/tags/:tagId', () => {
  it('returns 204 when detached by author', async () => {
    const { token } = await seedUser();
    const recipe = await seedRecipe(token);
    const tag = await seedTag(token, { slug: uniq('vegan') });
    await authedReq(token).post(`/recipes/${recipe.id}/tags`).send({ tagId: tag.id });

    const res = await authedReq(token).delete(`/recipes/${recipe.id}/tags/${tag.id}`);
    expect(res.status).toBe(204);
  });

  it('returns 403 when detached by non-author', async () => {
    const { token: authorToken } = await seedUser({ email: `${uniq('author')}@b.com` });
    const { token } = await seedUser({ email: `${uniq('other')}@b.com` });
    const recipe = await seedRecipe(authorToken);
    const tag = await seedTag(authorToken, { slug: uniq('vegan') });

    const res = await authedReq(token).delete(`/recipes/${recipe.id}/tags/${tag.id}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /tags/:slug/recipes', () => {
  it('returns 200 with tag + filtered recipes', async () => {
    const { token } = await seedUser();
    const recipe = await seedRecipe(token, { title: 'Pasta', difficulty: 'easy' });
    const slug = uniq('vegan');
    const tag = await seedTag(token, { slug });
    await authedReq(token).post(`/recipes/${recipe.id}/tags`).send({ tagId: tag.id });

    const res = await request(app).get(`/tags/${slug}/recipes`);
    expect(res.status).toBe(200);
    expect(res.body.tag).toMatchObject({ slug });
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(recipe.id);
  });

  it('applies difficulty filter inside /tags/:slug/recipes', async () => {
    const { token } = await seedUser();
    const easy = await seedRecipe(token, { title: 'Easy', difficulty: 'easy' });
    const hard = await seedRecipe(token, { title: 'Hard', difficulty: 'hard' });
    const slug = uniq('vegan');
    const tag = await seedTag(token, { slug });
    await authedReq(token).post(`/recipes/${easy.id}/tags`).send({ tagId: tag.id });
    await authedReq(token).post(`/recipes/${hard.id}/tags`).send({ tagId: tag.id });

    const res = await request(app).get(`/tags/${slug}/recipes?difficulty=easy`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].difficulty).toBe('easy');
  });
});
