import express, { type NextFunction, type Request, type Response } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import { migrateProfile } from '../src/lib/schema';
import type { CVData } from '../src/types/cv';
import {
  SESSION_COOKIE, SESSION_TTL_MS,
  createSession, destroySession, getUserIdForToken, hashPassword, newUserId, parseCookies, verifyPassword,
} from './auth';

interface ProfileRow {
  id: string;
  owner_id: string | null;
  profile_name: string;
  schema_version: number;
  version: number;
  updated_at: string;
  data_json: string;
  slug: string | null;
  published: number;
}
interface UserRow { id: string; email: string; password_salt: string; password_hash: string }
interface AuthedRequest extends Request { userId?: string }

function rowToProfile(row: ProfileRow): CVData {
  return JSON.parse(row.data_json) as CVData;
}

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

/** The API as an Express app over a given SQLite handle, kept separate from
 *  server/index.ts so tests can run it against an isolated in-memory database.
 *  Auth: email/password, hashed with scrypt, opaque session tokens (hashed
 *  before storage) in an HTTP-only cookie — no third-party auth provider, no
 *  JWT. Every /api/profiles route requires a session and is scoped to its
 *  owner; cross-owner access returns 404, not 403, so it doesn't confirm
 *  another profile's id exists. */
export function createApp(db: DatabaseSync, options: { secureCookies?: boolean } = {}) {
  const app = express();
  app.use(express.json({ limit: '8mb' })); // profiles currently embed base64 images

  const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure: !!options.secureCookies, path: '/' };
  const setSessionCookie = (res: Response, token: string) => res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_TTL_MS });

  function requireAuth(req: Request, res: Response, next: NextFunction) {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    const userId = token ? getUserIdForToken(db, token) : null;
    if (!userId) { res.status(401).json({ error: 'Not authenticated' }); return; }
    (req as AuthedRequest).userId = userId;
    next();
  }
  // Only called on routes behind requireAuth, which guarantees userId is set.
  const getOwnerId = (req: Request) => (req as AuthedRequest).userId as string;

  // --- Auth -----------------------------------------------------------
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid email or password.' }); return; }
    const { email, password } = parsed.data;
    if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }
    const { salt, hash } = await hashPassword(password);
    const id = newUserId();
    db.prepare('INSERT INTO users (id, email, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?)').run(id, email, salt, hash, new Date().toISOString());
    const { token } = createSession(db, id);
    setSessionCookie(res, token);
    res.status(201).json({ id, email });
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Enter a valid email and password.' }); return; }
    const { email, password } = parsed.data;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
    if (!user || !(await verifyPassword(password, user.password_salt, user.password_hash))) {
      res.status(401).json({ error: 'Incorrect email or password.' });
      return;
    }
    const { token } = createSession(db, user.id);
    setSessionCookie(res, token);
    res.json({ id: user.id, email: user.email });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (token) destroySession(db, token);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.status(204).end();
  });

  app.get('/api/auth/me', (req: Request, res: Response) => {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    const userId = token ? getUserIdForToken(db, token) : null;
    const user = userId ? (db.prepare('SELECT id, email FROM users WHERE id = ?').get(userId) as { id: string; email: string } | undefined) : undefined;
    if (!user) { res.status(401).json({ error: 'Not authenticated' }); return; }
    res.json(user);
  });

  // --- Profiles (all owner-scoped) -------------------------------------
  app.use('/api/profiles', requireAuth);

  app.get('/api/profiles', (req: Request, res: Response) => {
    const userId = getOwnerId(req);
    const rows = db.prepare('SELECT * FROM profiles WHERE owner_id = ? ORDER BY updated_at DESC').all(userId) as unknown as ProfileRow[];
    res.json(rows.map(rowToProfile));
  });

  app.get('/api/profiles/:id', (req: Request, res: Response) => {
    const userId = getOwnerId(req);
    const id = String(req.params.id);
    const row = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id) as ProfileRow | undefined;
    if (!row || row.owner_id !== userId) { res.status(404).json({ error: 'Profile not found' }); return; }
    res.json(rowToProfile(row));
  });

  app.put('/api/profiles/:id', (req: Request, res: Response) => {
    const userId = getOwnerId(req);
    const id = String(req.params.id);
    const { profile: rawProfile, expectedVersion } = (req.body ?? {}) as { profile?: unknown; expectedVersion?: number };
    if (!rawProfile || typeof rawProfile !== 'object' || (rawProfile as { id?: unknown }).id !== id) {
      res.status(400).json({ error: 'Request body must include a profile whose id matches the URL' });
      return;
    }

    let profile: CVData;
    try { profile = migrateProfile(rawProfile); }
    catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid profile' }); return; }

    const current = db.prepare('SELECT * FROM profiles WHERE id = ?').get(profile.id) as ProfileRow | undefined;
    if (current && current.owner_id !== userId) { res.status(404).json({ error: 'Profile not found' }); return; }
    if (expectedVersion !== undefined && current && current.version !== expectedVersion) {
      res.status(409).json({ error: 'This profile changed since it was loaded.', current: rowToProfile(current) });
      return;
    }

    const next: CVData = { ...profile, version: (current?.version ?? 0) + 1, updatedAt: new Date().toISOString() };
    db.prepare(`
      INSERT INTO profiles (id, owner_id, profile_name, schema_version, version, updated_at, data_json, slug, published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        profile_name = excluded.profile_name, schema_version = excluded.schema_version,
        version = excluded.version, updated_at = excluded.updated_at, data_json = excluded.data_json,
        slug = excluded.slug, published = excluded.published
    `).run(next.id, userId, next.profileName, next.schemaVersion, next.version, next.updatedAt, JSON.stringify(next), next.portfolio.slug, next.portfolio.published ? 1 : 0);

    res.json(next);
  });

  app.delete('/api/profiles/:id', (req: Request, res: Response) => {
    const userId = getOwnerId(req);
    db.prepare('DELETE FROM profiles WHERE id = ? AND owner_id = ?').run(String(req.params.id), userId);
    res.status(204).end();
  });

  // --- Public, unauthenticated portfolio lookup -------------------------
  // Deliberately returns the same 404 for "no such slug" and "exists but
  // unpublished" — an anonymous visitor shouldn't be able to tell those
  // apart. `slug`/`published` are denormalized copies of the values inside
  // `data_json`, kept in sync on every PUT above, purely so this can be a
  // real indexed query instead of scanning every row. Not yet globally
  // unique (see implementation-plan Phase 3) — on a collision this serves
  // whichever matching row was updated most recently.
  app.get('/api/public/:slug', (req: Request, res: Response) => {
    const slug = String(req.params.slug);
    const row = db.prepare('SELECT * FROM profiles WHERE slug = ? AND published = 1 ORDER BY updated_at DESC LIMIT 1').get(slug) as ProfileRow | undefined;
    if (!row) { res.status(404).json({ error: 'Portfolio not found' }); return; }
    res.json(rowToProfile(row));
  });

  return app;
}
