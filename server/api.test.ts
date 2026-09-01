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

const baseProfile = {
  schemaVersion: 2, version: 1, id: 'profile-1', profileName: 'Test Profile', updatedAt: new Date().toISOString(),
  personal: { fullName: 'Ada Lovelace', email: 'ada@example.com', phone: '000' },
  summary: {}, location: {}, experiences: [], education: [], certifications: [], skills: [], hobbies: [], references: [], projects: [],
  settings: { primary: '#1739b6', sections: [] },
  portfolio: {
    slug: 'ada', published: false, heroImageAlt: '', aboutImageAlt: '', contactHeading: '', contactBody: '',
    sections: { hero: true, about: true, services: true, projects: true, testimonials: true, contact: true },
    services: [], testimonials: [],
  },
};

/** Registers a fresh user and returns a supertest agent that carries the
 *  resulting session cookie across requests. */
async function loggedInAgent(app: ReturnType<typeof createApp>, email: string) {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ email, password: 'correct horse battery' });
  return agent;
}

describe('profiles API (owner-scoped)', () => {
  let app: ReturnType<typeof createApp>;
  beforeEach(() => { app = createApp(makeTestDb()); });

  it('requires authentication for every /api/profiles route', async () => {
    expect((await request(app).get('/api/profiles')).status).toBe(401);
    expect((await request(app).get('/api/profiles/profile-1')).status).toBe(401);
    expect((await request(app).put('/api/profiles/profile-1')).status).toBe(401);
    expect((await request(app).delete('/api/profiles/profile-1')).status).toBe(401);
  });

  it('returns an empty list for a fresh user', async () => {
    const agent = await loggedInAgent(app, 'a@example.com');
    const res = await agent.get('/api/profiles');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('creates a profile via PUT, owned by the authenticated user, version 1', async () => {
    const agent = await loggedInAgent(app, 'a@example.com');
    const res = await agent.put('/api/profiles/profile-1').send({ profile: baseProfile });
    expect(res.status).toBe(200);
    expect(res.body.version).toBe(1);
    expect(res.body.profileName).toBe('Test Profile');
  });

  it('lists and gets a saved profile', async () => {
    const agent = await loggedInAgent(app, 'a@example.com');
    await agent.put('/api/profiles/profile-1').send({ profile: baseProfile });
    expect((await agent.get('/api/profiles')).body).toHaveLength(1);
    const single = await agent.get('/api/profiles/profile-1');
    expect(single.status).toBe(200);
    expect(single.body.id).toBe('profile-1');
  });

  it('404s for a profile that does not exist', async () => {
    const agent = await loggedInAgent(app, 'a@example.com');
    expect((await agent.get('/api/profiles/nope')).status).toBe(404);
  });

  it('updates and increments version on a second save', async () => {
    const agent = await loggedInAgent(app, 'a@example.com');
    const first = await agent.put('/api/profiles/profile-1').send({ profile: baseProfile });
    const second = await agent.put('/api/profiles/profile-1').send({ profile: { ...baseProfile, profileName: 'Renamed' }, expectedVersion: first.body.version });
    expect(second.status).toBe(200);
    expect(second.body.version).toBe(2);
    expect(second.body.profileName).toBe('Renamed');
  });

  it('rejects a save with a stale expectedVersion with 409 and the current record', async () => {
    const agent = await loggedInAgent(app, 'a@example.com');
    await agent.put('/api/profiles/profile-1').send({ profile: baseProfile }); // version 1
    await agent.put('/api/profiles/profile-1').send({ profile: { ...baseProfile, profileName: 'A' }, expectedVersion: 1 }); // version 2
    const conflict = await agent.put('/api/profiles/profile-1').send({ profile: { ...baseProfile, profileName: 'B' }, expectedVersion: 1 });
    expect(conflict.status).toBe(409);
    expect(conflict.body.current.version).toBe(2);
  });

  it('rejects a body whose profile id does not match the URL', async () => {
    const agent = await loggedInAgent(app, 'a@example.com');
    const res = await agent.put('/api/profiles/profile-1').send({ profile: { ...baseProfile, id: 'other-id' } });
    expect(res.status).toBe(400);
  });

  it('rejects a structurally invalid profile', async () => {
    const agent = await loggedInAgent(app, 'a@example.com');
    const res = await agent.put('/api/profiles/profile-1').send({ profile: { id: 'profile-1' } });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('deletes a profile', async () => {
    const agent = await loggedInAgent(app, 'a@example.com');
    await agent.put('/api/profiles/profile-1').send({ profile: baseProfile });
    const del = await agent.delete('/api/profiles/profile-1');
    expect(del.status).toBe(204);
    expect((await agent.get('/api/profiles/profile-1')).status).toBe(404);
  });

  it("hides another user's profile as 404, not 403 (no existence leak)", async () => {
    const owner = await loggedInAgent(app, 'owner@example.com');
    await owner.put('/api/profiles/profile-1').send({ profile: baseProfile });

    const intruder = await loggedInAgent(app, 'intruder@example.com');
    expect((await intruder.get('/api/profiles/profile-1')).status).toBe(404);
    expect((await intruder.get('/api/profiles')).body).toEqual([]);
  });

});

describe('public portfolio lookup (unauthenticated)', () => {
  let app: ReturnType<typeof createApp>;
  beforeEach(() => { app = createApp(makeTestDb()); });

  it('404s for a slug that was never saved, with no auth required', async () => {
    const res = await request(app).get('/api/public/nobody-here');
    expect(res.status).toBe(404);
  });

  it('404s for a real but unpublished slug (does not leak that it exists)', async () => {
    const agent = await loggedInAgent(app, 'owner@example.com');
    await agent.put('/api/profiles/profile-1').send({ profile: { ...baseProfile, portfolio: { ...baseProfile.portfolio, published: false } } });

    const res = await request(app).get(`/api/public/${baseProfile.portfolio.slug}`);
    expect(res.status).toBe(404);
  });

  it('serves a published profile by slug with no session cookie at all', async () => {
    const agent = await loggedInAgent(app, 'owner@example.com');
    await agent.put('/api/profiles/profile-1').send({ profile: { ...baseProfile, portfolio: { ...baseProfile.portfolio, published: true } } });

    const res = await request(app).get(`/api/public/${baseProfile.portfolio.slug}`); // plain request, no agent/cookie
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('profile-1');
    expect(res.body.portfolio.published).toBe(true);
  });

  it('stops serving it once unpublished again', async () => {
    const agent = await loggedInAgent(app, 'owner@example.com');
    await agent.put('/api/profiles/profile-1').send({ profile: { ...baseProfile, portfolio: { ...baseProfile.portfolio, published: true } } });
    await agent.put('/api/profiles/profile-1').send({ profile: { ...baseProfile, portfolio: { ...baseProfile.portfolio, published: false } }, expectedVersion: 1 });

    const res = await request(app).get(`/api/public/${baseProfile.portfolio.slug}`);
    expect(res.status).toBe(404);
  });
});

describe('profile ownership isolation', () => {
  let app: ReturnType<typeof createApp>;
  beforeEach(() => { app = createApp(makeTestDb()); });

  it("does not let a second user overwrite or delete another user's profile", async () => {
    const owner = await loggedInAgent(app, 'owner2@example.com');
    await owner.put('/api/profiles/profile-1').send({ profile: baseProfile });

    const intruder = await loggedInAgent(app, 'intruder2@example.com');
    const overwrite = await intruder.put('/api/profiles/profile-1').send({ profile: { ...baseProfile, profileName: 'Hijacked' } });
    expect(overwrite.status).toBe(404);
    await intruder.delete('/api/profiles/profile-1');

    const stillThere = await owner.get('/api/profiles/profile-1');
    expect(stillThere.status).toBe(200);
    expect(stillThere.body.profileName).toBe('Test Profile');
  });
});
