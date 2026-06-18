import { describe, expect, it } from 'vitest';
import { app, authedReq, request, seedUser } from './helpers';

describe('GET /users/:id', () => {
  it('returns 200 with public user (no password)', async () => {
    const { user } = await seedUser({ email: 'a@b.com', name: 'Alice' });
    const res = await request(app).get(`/users/${user.id}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: user.id, email: 'a@b.com', name: 'Alice' });
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('returns 404 for missing user', async () => {
    const res = await request(app).get('/users/99999');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 on non-numeric :id', async () => {
    const res = await request(app).get('/users/abc');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('PATCH /users/:id', () => {
  it('returns 200 when patching self', async () => {
    const { user, token } = await seedUser({ name: 'Alice' });
    const res = await authedReq(token).patch(`/users/${user.id}`).send({ name: 'Alicia' });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Alicia');
  });

  it('returns 403 when patching another user', async () => {
    const { user: me } = await seedUser({ email: 'me@b.com' });
    const { token: otherToken } = await seedUser({ email: 'other@b.com' });

    const res = await authedReq(otherToken).patch(`/users/${me.id}`).send({ name: 'Hacked' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 409 on email conflict', async () => {
    const { user: me, token } = await seedUser({ email: 'me@b.com' });
    const { user: other } = await seedUser({ email: 'taken@b.com' });
    void other;

    const res = await authedReq(token).patch(`/users/${me.id}`).send({ email: 'taken@b.com' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('returns 400 when changing password without currentPassword', async () => {
    const { user, token } = await seedUser();
    const res = await authedReq(token).patch(`/users/${user.id}`).send({ password: 'newpass99' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 on wrong currentPassword', async () => {
    const { user, token } = await seedUser({ password: 'oldpass99' });
    const res = await authedReq(token)
      .patch(`/users/${user.id}`)
      .send({ password: 'newpass99', currentPassword: 'wrong-old' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 200 on correct currentPassword', async () => {
    const { user, token } = await seedUser({ password: 'oldpass99' });
    const res = await authedReq(token)
      .patch(`/users/${user.id}`)
      .send({ password: 'newpass99', currentPassword: 'oldpass99' });

    expect(res.status).toBe(200);
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('returns 400 on non-numeric :id', async () => {
    const { token } = await seedUser();
    const res = await authedReq(token).patch('/users/abc').send({ name: 'X' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
