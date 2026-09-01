// @vitest-environment node
import { DatabaseSync } from 'node:sqlite';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './api';

function makeTestDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE profiles (
      id TEXT PRIMARY KEY, owner_id TEXT, profile_name TEXT NOT NULL,
      schema_version INTEGER NOT NULL, version INTEGER NOT NULL,
      updated_at TEXT NOT NULL, data_json TEXT NOT NULL,
      slug TEXT, published INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE,
      password_salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL);
  `);
  return db;
}

describe('auth API', () => {
  let app: ReturnType<typeof createApp>;
  beforeEach(() => { app = createApp(makeTestDb()); });

  it('registers a new user, sets a session cookie, and returns the account', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'Ada@Example.com', password: 'correct horse battery' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(String), email: 'ada@example.com' }); // normalized lowercase
    expect(res.headers['set-cookie']?.[0]).toMatch(/^session=/);
  });

  it('rejects a short password', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@example.com', password: 'short' });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'not-an-email', password: 'correct horse battery' });
    expect(res.status).toBe(400);
  });

  it('rejects registering the same email twice', async () => {
    await request(app).post('/api/auth/register').send({ email: 'a@example.com', password: 'correct horse battery' });
    const res = await request(app).post('/api/auth/register').send({ email: 'a@example.com', password: 'another password' });
    expect(res.status).toBe(409);
  });

  it('logs in with the correct password and rejects the wrong one', async () => {
    await request(app).post('/api/auth/register').send({ email: 'a@example.com', password: 'correct horse battery' });

    const wrong = await request(app).post('/api/auth/login').send({ email: 'a@example.com', password: 'wrong password' });
    expect(wrong.status).toBe(401);

    const right = await request(app).post('/api/auth/login').send({ email: 'a@example.com', password: 'correct horse battery' });
    expect(right.status).toBe(200);
    expect(right.body.email).toBe('a@example.com');
  });

  it('rejects login for an email that was never registered', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'ghost@example.com', password: 'correct horse battery' });
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me reflects the session, or 401 without one', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);

    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ email: 'a@example.com', password: 'correct horse battery' });
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.email).toBe('a@example.com');
  });

  it('logout clears the session so /me and profile routes 401 again', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ email: 'a@example.com', password: 'correct horse battery' });
    expect((await agent.get('/api/auth/me')).status).toBe(200);

    const logout = await agent.post('/api/auth/logout');
    expect(logout.status).toBe(204);

    expect((await agent.get('/api/auth/me')).status).toBe(401);
    expect((await agent.get('/api/profiles')).status).toBe(401);
  });

  it('rejects a request carrying a garbage session cookie', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', 'session=not-a-real-token');
    expect(res.status).toBe(401);
  });
});
