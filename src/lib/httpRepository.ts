import { migrateProfile } from './schema';
import { ConcurrencyError, type ProfileRepository, type PublishedPortfolio } from './repository';
import type { CVData } from '../types/cv';

export class AuthRequiredError extends Error {
  constructor() { super('Sign in to continue.'); this.name = 'AuthRequiredError'; }
}

function throwForStatus(res: Response, fallback: string): never {
  if (res.status === 401) throw new AuthRequiredError();
  throw new Error(fallback);
}

/** CRUD against the real SQL (SQLite) backend in `server/`, over the same
 *  `/api/profiles` routes the Vite dev proxy forwards (see vite.config.ts).
 *  Every response still goes through `migrateProfile` — the client trusts
 *  the server no more than it trusts a JSON file import. Every request sends
 *  the session cookie (`credentials: 'include'`); these routes are all
 *  owner-scoped and 401 without one — see server/api.ts. */
export class HttpProfileRepository implements ProfileRepository {
  async list(): Promise<CVData[]> {
    const res = await fetch('/api/profiles', { credentials: 'include' });
    if (!res.ok) throwForStatus(res, `Could not load profiles (${res.status}).`);
    const rows = (await res.json()) as unknown[];
    return rows.map(migrateProfile);
  }

  async get(id: string): Promise<CVData | null> {
    const res = await fetch(`/api/profiles/${encodeURIComponent(id)}`, { credentials: 'include' });
    if (res.status === 404) return null;
    if (!res.ok) throwForStatus(res, `Could not load profile (${res.status}).`);
    return migrateProfile(await res.json());
  }

  async save(profile: CVData, expectedVersion?: number): Promise<CVData> {
    const res = await fetch(`/api/profiles/${encodeURIComponent(profile.id)}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, expectedVersion }),
    });
    if (res.status === 409) {
      const body = (await res.json()) as { current: unknown };
      throw new ConcurrencyError(migrateProfile(body.current));
    }
    if (!res.ok) {
      if (res.status === 401) throw new AuthRequiredError();
      const body = await res.json().catch(() => null) as { error?: string } | null;
      throw new Error(body?.error ?? `Could not save profile (${res.status}).`);
    }
    return migrateProfile(await res.json());
  }

  async remove(id: string): Promise<void> {
    const res = await fetch(`/api/profiles/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok && res.status !== 404) throwForStatus(res, `Could not delete profile (${res.status}).`);
  }

  async findPublishedBySlug(slug: string): Promise<CVData | null> {
    // Deliberately no credentials — a signed-out visitor must be able to load this.
    const res = await fetch(`/api/public/${encodeURIComponent(slug)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Could not load this portfolio (${res.status}).`);
    return migrateProfile(await res.json());
  }

  async publish(): Promise<PublishedPortfolio> {
    throw new Error('Publishing to a public URL requires the cloud backend (Phase 2/3) and is not implemented yet.');
  }
  async unpublish(): Promise<void> {
    throw new Error('Publishing to a public URL requires the cloud backend (Phase 2/3) and is not implemented yet.');
  }
}
