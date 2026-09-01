import type { CVData } from '../types/cv';
import { db } from './db';

/** Sanitized public-read shape a future backend would serve at /p/:slug.
 *  Not produced by this local-only build — see publish()/unpublish() below
 *  and docs/portfolio/IMPLEMENTATION_PLAN.md sections 5.3–5.4. */
export interface PublishedPortfolio {
  slug: string;
  publishedAt: string;
  profile: CVData;
}

export interface ProfileRepository {
  list(): Promise<CVData[]>;
  get(id: string): Promise<CVData | null>;
  save(profile: CVData, expectedVersion?: number): Promise<CVData>;
  remove(id: string): Promise<void>;
  publish(id: string): Promise<PublishedPortfolio>;
  unpublish(id: string): Promise<void>;
  /** Read-only, unauthenticated lookup for the public `/p/:slug` route — the
   *  one thing a signed-out visitor is allowed to fetch. Must not require a
   *  session, unlike every other method here. */
  findPublishedBySlug(slug: string): Promise<CVData | null>;
}

export class ConcurrencyError extends Error {
  constructor(public readonly current: CVData) {
    super('This profile changed since it was loaded. Reload the page and reapply your changes.');
    this.name = 'ConcurrencyError';
  }
}

/** Local, browser-only implementation backed by IndexedDB (Dexie). UI code
 *  depends on `ProfileRepository`, not this class or `db` directly, so a
 *  server-backed implementation (see `httpRepository.ts`) can replace it
 *  without touching the UI — see docs/portfolio/IMPLEMENTATION_PLAN.md
 *  section 5.1, and `activeRepository.ts` for which one is actually used. */
export class DexieProfileRepository implements ProfileRepository {
  async list(): Promise<CVData[]> { return db.profiles.orderBy('updatedAt').reverse().toArray(); }
  async get(id: string): Promise<CVData | null> { return (await db.profiles.get(id)) ?? null; }

  async save(profile: CVData, expectedVersion?: number): Promise<CVData> {
    if (expectedVersion !== undefined) {
      const current = await db.profiles.get(profile.id);
      if (current && current.version !== expectedVersion) throw new ConcurrencyError(current);
    }
    const next: CVData = { ...profile, version: profile.version + 1, updatedAt: new Date().toISOString() };
    await db.profiles.put(next);
    return next;
  }

  async remove(id: string): Promise<void> { await db.profiles.delete(id); }

  async findPublishedBySlug(slug: string): Promise<CVData | null> {
    const profiles = await this.list();
    return profiles.find((p) => p.portfolio.slug === slug && p.portfolio.published) ?? null;
  }

  async publish(): Promise<PublishedPortfolio> {
    throw new Error('Publishing to a public URL requires the cloud backend (Phase 2/3) and is not implemented in this local-only build. "Mark as published" in the portfolio editor is a local preview flag only.');
  }
  async unpublish(): Promise<void> {
    throw new Error('Publishing to a public URL requires the cloud backend (Phase 2/3) and is not implemented in this local-only build.');
  }
}
