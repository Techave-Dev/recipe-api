import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { app, request, seedUser } from './helpers';

describe('POST /auth/register', () => {
  it('returns 201 with user + token', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'a@b.com', password: 'secret123', name: 'Alice' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      user: { email: 'a@b.com', name: 'Alice' },
      token: expect.any(String),
    });
    expect(res.body.user).not.toHaveProperty('password');
    expect(res.body.user.id).toEqual(expect.any(Number));
  });

  it('returns 409 on duplicate email', async () => {
    const email = `dup-${Date.now()}@b.com`;
    await seedUser({ email });
    const res = await request(app)
      .post('/auth/register')
      .send({ email, password: 'secret123', name: 'Bob' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('returns 400 on weak password (<8)', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'a@b.com', password: 'short', name: 'A' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'password' })]),
    );
  });

  it('returns 400 on invalid email', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'not-an-email', password: 'secret123', name: 'A' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'email' })]),
    );
  });

  it('returns 400 on missing email', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ password: 'secret123', name: 'A' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'email' })]),
    );
  });

  it('returns 400 on empty body', async () => {
    const res = await request(app).post('/auth/register').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /auth/login', () => {
  it('returns 200 with user + token on correct password', async () => {
    await seedUser({ email: 'a@b.com', password: 'secret123' });
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'a@b.com', password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      user: { email: 'a@b.com' },
      token: expect.any(String),
    });
  });

  it('returns 401 on wrong password', async () => {
    await seedUser({ email: 'a@b.com', password: 'secret123' });
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'a@b.com', password: 'wrong-pwd' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('GET /auth/me', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 200 with user when valid token', async () => {
    const { user, token } = await seedUser({ email: 'a@b.com', name: 'Alice' });
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: user.id, email: 'a@b.com', name: 'Alice' });
  });

  it('returns 401 with malformed Bearer (no token)', async () => {
    const res = await request(app).get('/auth/me').set('Authorization', 'Bearer');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 with Basic auth scheme', async () => {
    const res = await request(app).get('/auth/me').set('Authorization', 'Basic dXNlcjpwYXNz');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 with garbage token', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer garbage.token.here');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 with wrong-secret token', async () => {
    const wrongToken = jwt.sign({ sub: 1, email: 'x@y.com' }, 'wrong-secret');
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${wrongToken}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 with expired token', async () => {
    const expiredToken = jwt.sign(
      { sub: 1, email: 'x@y.com' },
      process.env.JWT_SECRET ?? 'test-secret',
      {
        expiresIn: '-1s',
      },
    );
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
