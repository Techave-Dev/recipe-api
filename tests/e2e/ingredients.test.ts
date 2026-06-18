import { describe, expect, it } from 'vitest';
import {
  app,
  attachTag,
  authedReq,
  request,
  seedIngredient,
  seedRecipe,
  seedTag,
  seedUser,
} from './helpers';

describe('POST /recipes/:recipeId/ingredients', () => {
  it('returns 201 when created by author', async () => {
    const { token } = await seedUser();
    const recipe = await seedRecipe(token);
    const res = await authedReq(token)
      .post(`/recipes/${recipe.id}/ingredients`)
      .send({ name: 'Salt', quantity: '1 tsp' });

    expect(res.status).toBe(201);
    expect(res.body.ingredient).toMatchObject({
      name: 'Salt',
      quantity: '1 tsp',
      recipeId: recipe.id,
    });
  });

  it('returns 403 when created by non-author', async () => {
    const { token: authorToken } = await seedUser({ email: 'author@b.com' });
    const { token } = await seedUser({ email: 'other@b.com' });
    const recipe = await seedRecipe(authorToken);

    const res = await authedReq(token)
      .post(`/recipes/${recipe.id}/ingredients`)
      .send({ name: 'X', quantity: '1' });
    expect(res.status).toBe(403);
  });

  it('returns 404 for missing recipe', async () => {
    const { token } = await seedUser();
    const res = await authedReq(token)
      .post('/recipes/99999/ingredients')
      .send({ name: 'X', quantity: '1' });
    expect(res.status).toBe(404);
  });

  it('returns 404 when recipe is deleted', async () => {
    const { token } = await seedUser();
    const recipe = await seedRecipe(token);
    await authedReq(token).delete(`/recipes/${recipe.id}`);

    const res = await authedReq(token)
      .post(`/recipes/${recipe.id}/ingredients`)
      .send({ name: 'X', quantity: '1' });
    expect(res.status).toBe(404);
  });
});

describe('GET /recipes/:recipeId/ingredients', () => {
  it('returns 200 with public list', async () => {
    const { token } = await seedUser();
    const recipe = await seedRecipe(token);
    await seedIngredient(token, recipe.id, { name: 'Salt' });
    await seedIngredient(token, recipe.id, { name: 'Pepper' });

    const res = await request(app).get(`/recipes/${recipe.id}/ingredients`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});

describe('PATCH /ingredients/:id', () => {
  it('returns 200 when patched by recipe author', async () => {
    const { token } = await seedUser();
    const recipe = await seedRecipe(token);
    const ing = await seedIngredient(token, recipe.id, { name: 'Salt' });

    const res = await authedReq(token).patch(`/ingredients/${ing.id}`).send({ name: 'Sea Salt' });
    expect(res.status).toBe(200);
    expect(res.body.ingredient.name).toBe('Sea Salt');
  });

  it('returns 403 when patched by non-author', async () => {
    const { token: authorToken } = await seedUser({ email: 'author@b.com' });
    const { token } = await seedUser({ email: 'other@b.com' });
    const recipe = await seedRecipe(authorToken);
    const ing = await seedIngredient(authorToken, recipe.id);

    const res = await authedReq(token).patch(`/ingredients/${ing.id}`).send({ name: 'X' });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /ingredients/:id', () => {
  it('returns 204 when deleted by author', async () => {
    const { token } = await seedUser();
    const recipe = await seedRecipe(token);
    const ing = await seedIngredient(token, recipe.id);
    const res = await authedReq(token).delete(`/ingredients/${ing.id}`);
    expect(res.status).toBe(204);
  });

  it('returns 403 when deleted by non-author', async () => {
    const { token: authorToken } = await seedUser({ email: 'author@b.com' });
    const { token } = await seedUser({ email: 'other@b.com' });
    const recipe = await seedRecipe(authorToken);
    const ing = await seedIngredient(authorToken, recipe.id);

    const res = await authedReq(token).delete(`/ingredients/${ing.id}`);
    expect(res.status).toBe(403);
  });
});

describe('Cascade delete', () => {
  it('cascades ingredients and recipe_tags when recipe is deleted', async () => {
    const { token } = await seedUser();
    const recipe = await seedRecipe(token);
    await seedIngredient(token, recipe.id, { name: 'Salt' });
    const tag = await seedTag(token, { slug: 'vegan' });
    await attachTag(token, recipe.id, tag.id);

    const res = await authedReq(token).delete(`/recipes/${recipe.id}`);
    expect(res.status).toBe(204);

    const ing = await request(app).get(`/recipes/${recipe.id}/ingredients`);
    expect(ing.status).toBe(404);
  });
});
