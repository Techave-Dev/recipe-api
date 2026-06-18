import { describe, expect, it } from 'vitest';
import { app, attachTag, authedReq, request, seedRecipe, seedTag, seedUser } from './helpers';

describe('POST /recipes', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/recipes')
      .send({ title: 'Pasta', cookingTime: 20, difficulty: 'easy' });
    expect(res.status).toBe(401);
  });

  it('returns 201 on valid input', async () => {
    const { token } = await seedUser();
    const res = await authedReq(token)
      .post('/recipes')
      .send({ title: 'Pasta', description: 'yum', cookingTime: 20, difficulty: 'easy' });

    expect(res.status).toBe(201);
    expect(res.body.recipe).toMatchObject({
      title: 'Pasta',
      description: 'yum',
      cookingTime: 20,
      difficulty: 'easy',
    });
  });

  it('returns 400 on invalid difficulty', async () => {
    const { token } = await seedUser();
    const res = await authedReq(token)
      .post('/recipes')
      .send({ title: 'Pasta', cookingTime: 20, difficulty: 'impossible' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 on cookingTime=0', async () => {
    const { token } = await seedUser();
    const res = await authedReq(token)
      .post('/recipes')
      .send({ title: 'Pasta', cookingTime: 0, difficulty: 'easy' });

    expect(res.status).toBe(400);
  });

  it('returns 400 on negative cookingTime', async () => {
    const { token } = await seedUser();
    const res = await authedReq(token)
      .post('/recipes')
      .send({ title: 'Pasta', cookingTime: -1, difficulty: 'easy' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 on non-integer cookingTime', async () => {
    const { token } = await seedUser();
    const res = await authedReq(token)
      .post('/recipes')
      .send({ title: 'Pasta', cookingTime: 'abc', difficulty: 'easy' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /recipes', () => {
  it('returns 200 with empty list when no recipes', async () => {
    const res = await request(app).get('/recipes');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ data: [], page: 1, total: 0 });
  });

  it('returns 400 on limit > 100', async () => {
    const res = await request(app).get('/recipes?limit=101');
    expect(res.status).toBe(400);
  });

  it('returns 400 on limit=0', async () => {
    const res = await request(app).get('/recipes?limit=0');
    expect(res.status).toBe(400);
  });

  it('paginates results', async () => {
    const { token } = await seedUser();
    for (let i = 0; i < 5; i++) await seedRecipe(token, { title: `R${i}` });
    const res = await request(app).get('/recipes?page=2&limit=2');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.page).toBe(2);
  });

  it('returns 400 on invalid sort field', async () => {
    const res = await request(app).get('/recipes?sort=banana:asc');
    expect(res.status).toBe(400);
  });

  it('returns 400 on difficulty=impossible', async () => {
    const res = await request(app).get('/recipes?difficulty=impossible');
    expect(res.status).toBe(400);
  });

  it('returns 400 on cookingTimeMax=abc', async () => {
    const res = await request(app).get('/recipes?cookingTimeMax=abc');
    expect(res.status).toBe(400);
  });

  it('returns 400 on page=0', async () => {
    const res = await request(app).get('/recipes?page=0');
    expect(res.status).toBe(400);
  });

  it('returns 400 on page=abc', async () => {
    const res = await request(app).get('/recipes?page=abc');
    expect(res.status).toBe(400);
  });
});

describe('GET /recipes/:id', () => {
  it('returns 200 with recipe + relations', async () => {
    const { token } = await seedUser();
    const recipe = await seedRecipe(token, { title: 'Pasta' });
    const tag = await seedTag(token, { slug: 'vegan' });
    await attachTag(token, recipe.id, tag.id);

    const res = await request(app).get(`/recipes/${recipe.id}`);
    expect(res.status).toBe(200);
    expect(res.body.recipe).toMatchObject({ id: recipe.id, title: 'Pasta' });
    expect(res.body.ingredients).toEqual([]);
    expect(res.body.tags).toEqual([expect.objectContaining({ slug: 'vegan' })]);
  });

  it('returns 404 for missing recipe', async () => {
    const res = await request(app).get('/recipes/99999');
    expect(res.status).toBe(404);
  });

  it('returns 404 for negative recipe id', async () => {
    const res = await request(app).get('/recipes/-1');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /recipes/:id', () => {
  it('returns 200 when patched by author', async () => {
    const { token } = await seedUser();
    const recipe = await seedRecipe(token);
    const res = await authedReq(token).patch(`/recipes/${recipe.id}`).send({ title: 'New' });
    expect(res.status).toBe(200);
    expect(res.body.recipe.title).toBe('New');
  });

  it('returns 403 when patched by non-author', async () => {
    const { token: authorToken } = await seedUser({ email: 'author@b.com' });
    const { token } = await seedUser({ email: 'other@b.com' });
    const recipe = await seedRecipe(authorToken);

    const res = await authedReq(token).patch(`/recipes/${recipe.id}`).send({ title: 'X' });
    expect(res.status).toBe(403);
  });

  it('returns 404 when patched after delete', async () => {
    const { token } = await seedUser();
    const recipe = await seedRecipe(token);
    await authedReq(token).delete(`/recipes/${recipe.id}`);

    const res = await authedReq(token).patch(`/recipes/${recipe.id}`).send({ title: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /recipes/:id', () => {
  it('returns 204 when deleted by author', async () => {
    const { token } = await seedUser();
    const recipe = await seedRecipe(token);
    const res = await authedReq(token).delete(`/recipes/${recipe.id}`);
    expect(res.status).toBe(204);
  });

  it('returns 403 when deleted by non-author', async () => {
    const { token: authorToken } = await seedUser({ email: 'author@b.com' });
    const { token } = await seedUser({ email: 'other@b.com' });
    const recipe = await seedRecipe(authorToken);

    const res = await authedReq(token).delete(`/recipes/${recipe.id}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 on second delete', async () => {
    const { token } = await seedUser();
    const recipe = await seedRecipe(token);
    await authedReq(token).delete(`/recipes/${recipe.id}`);

    const res = await authedReq(token).delete(`/recipes/${recipe.id}`);
    expect(res.status).toBe(404);
  });
});

describe('Recipe filters (GET /recipes)', () => {
  async function seedFixtures() {
    const { token: aliceToken } = await seedUser({ email: 'alice@b.com' });
    const { token: bobToken } = await seedUser({ email: 'bob@b.com' });
    const r1 = await seedRecipe(aliceToken, {
      title: 'Chicken Soup',
      cookingTime: 60,
      difficulty: 'medium',
    });
    const r2 = await seedRecipe(aliceToken, {
      title: 'Veggie Pasta',
      cookingTime: 20,
      difficulty: 'easy',
    });
    const r3 = await seedRecipe(bobToken, {
      title: 'Beef Stew',
      cookingTime: 120,
      difficulty: 'hard',
    });
    return { aliceToken, bobToken, r1, r2, r3 };
  }

  it('filters by difficulty', async () => {
    const { aliceToken } = await seedFixtures();
    void aliceToken;
    const res = await request(app).get('/recipes?difficulty=easy');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].difficulty).toBe('easy');
  });

  it('filters by cookingTimeMax', async () => {
    await seedFixtures();
    const res = await request(app).get('/recipes?cookingTimeMax=30');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].cookingTime).toBeLessThanOrEqual(30);
  });

  it('filters by authorId', async () => {
    const { r1, r2, r3 } = await seedFixtures();
    const authorId = r1.authorId;
    const res = await request(app).get(`/recipes?authorId=${authorId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.map((r: { id: number }) => r.id).sort()).toEqual([r1.id, r2.id].sort());
    expect(res.body.data.find((r: { id: number }) => r.id === r3.id)).toBeUndefined();
  });

  it('filters by search (ILIKE title)', async () => {
    await seedFixtures();
    const res = await request(app).get('/recipes?search=chicken');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toMatch(/chicken/i);
  });

  it('sorts by cookingTime:asc', async () => {
    await seedFixtures();
    const res = await request(app).get('/recipes?sort=cookingTime:asc');
    expect(res.status).toBe(200);
    const times = res.body.data.map((r: { cookingTime: number }) => r.cookingTime);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it('filters by single tag', async () => {
    const { token } = await seedUser();
    const r1 = await seedRecipe(token, { title: 'Soup' });
    const tag = await seedTag(token, { slug: 'soup' });
    await attachTag(token, r1.id, tag.id);

    const res = await request(app).get('/recipes?tag=soup');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(r1.id);
  });

  it('filters by multiple tags (AND)', async () => {
    const { token } = await seedUser();
    const r1 = await seedRecipe(token, { title: 'Soup' });
    const t1 = await seedTag(token, { slug: 'soup' });
    const t2 = await seedTag(token, { slug: 'comfort' });
    await attachTag(token, r1.id, t1.id);
    await attachTag(token, r1.id, t2.id);

    const res = await request(app).get('/recipes?tag=soup&tag=comfort');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});
