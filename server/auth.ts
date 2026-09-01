import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { DatabaseSync } from 'node:sqlite';

const scryptAsync = promisify(scrypt);

export const SESSION_COOKIE = 'session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function hashPassword(password: string): Promise<{ salt: string; hash: string }> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return { salt, hash: derived.toString('hex') };
}

export async function verifyPassword(password: string, salt: string, hash: string): Promise<boolean> {
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const stored = Buffer.from(hash, 'hex');
  return derived.length === stored.length && timingSafeEqual(derived, stored);
}

function hashToken(token: string): string { return createHash('sha256').update(token).digest('hex'); }

/** Creates a session and returns the raw token (goes in the cookie) — only
 *  its SHA-256 hash is stored, so reading the sessions table doesn't hand
 *  out usable tokens. */
export function createSession(db: DatabaseSync, userId: string): { token: string; expiresAt: string } {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(hashToken(token), userId, expiresAt);
  return { token, expiresAt };
}

export function destroySession(db: DatabaseSync, token: string): void {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

export function getUserIdForToken(db: DatabaseSync, token: string): string | null {
  const row = db.prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?').get(hashToken(token)) as { user_id: string; expires_at: string } | undefined;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) { db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token)); return null; }
  return row.user_id;
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key) out[key] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

export function newUserId(): string { return randomUUID(); }
