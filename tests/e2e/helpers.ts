import request from 'supertest';
import { config as loadEnv } from 'dotenv';
import { createApp } from '../../src/app.ts';

loadEnv({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

export const app = createApp();

let n = 0;
const uniq = (p: string) => `${p}-${Date.now()}-${n++}`;

interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
}
interface Recipe {
  id: number;
  title: string;
  description: string | null;
  cookingTime: number;
  difficulty: string;
  authorId: number;
  createdAt: string;
}
interface Tag {
  id: number;
  name: string;
  slug: string;
}
interface Ingredient {
  id: number;
  recipeId: number;
  name: string;
  quantity: string;
}

export async function seedUser(
  o: { email?: string; password?: string; name?: string } = {},
): Promise<{ user: User; token: string }> {
  const body = {
    email: o.email ?? `${uniq('u')}@t.com`,
    password: o.password ?? 'password123',
    name: o.name ?? 'Test',
  };
  const res = await request(app).post('/auth/register').send(body);
  if (res.status !== 201) throw new Error(`seedUser ${res.status}: ${JSON.stringify(res.body)}`);
  return { user: res.body.user, token: res.body.token };
}

export function authedReq(token: string) {
  const agent = request.agent(app);
  agent.set('Authorization', `Bearer ${token}`);
  return agent;
}

export async function seedRecipe(
  token: string,
  o: {
    title?: string;
    description?: string | null;
    cookingTime?: number;
    difficulty?: string;
  } = {},
): Promise<Recipe> {
  const body = {
    title: o.title ?? uniq('r'),
    description: o.description ?? null,
    cookingTime: o.cookingTime ?? 30,
    difficulty: o.difficulty ?? 'easy',
  };
  const res = await authedReq(token).post('/recipes').send(body);
  if (res.status !== 201) throw new Error(`seedRecipe ${res.status}: ${JSON.stringify(res.body)}`);
  return res.body.recipe;
}

export async function seedTag(
  token: string,
  o: { name?: string; slug?: string } = {},
): Promise<Tag> {
  const body = { name: o.name ?? 'Tag', slug: o.slug ?? uniq('t') };
  const res = await authedReq(token).post('/tags').send(body);
  if (res.status !== 201) throw new Error(`seedTag ${res.status}: ${JSON.stringify(res.body)}`);
  return res.body.tag;
}

export async function seedIngredient(
  token: string,
  recipeId: number,
  o: { name?: string; quantity?: string } = {},
): Promise<Ingredient> {
  const body = { name: o.name ?? 'Salt', quantity: o.quantity ?? '1 tsp' };
  const res = await authedReq(token).post(`/recipes/${recipeId}/ingredients`).send(body);
  if (res.status !== 201)
    throw new Error(`seedIngredient ${res.status}: ${JSON.stringify(res.body)}`);
  return res.body.ingredient;
}

export async function attachTag(token: string, recipeId: number, tagId: number): Promise<void> {
  const res = await authedReq(token).post(`/recipes/${recipeId}/tags`).send({ tagId });
  if (res.status === 409) return;
  if (res.status !== 201) throw new Error(`attachTag ${res.status}: ${JSON.stringify(res.body)}`);
}

export { request };
