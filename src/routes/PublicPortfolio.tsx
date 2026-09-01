import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PortfolioPage } from '../components/portfolio/PortfolioPage';
import { profileRepository } from '../lib/activeRepository';
import type { CVData } from '../types/cv';

// NOTE on the local-only (Dexie) build: this still only reads the current
// browser's own IndexedDB, so the URL only renders for the person who built
// it, in that browser — a real shareable link needs the Phase 3 cloud
// snapshot read path (docs/portfolio/IMPLEMENTATION_PLAN.md sections 5.3–5.4,
// D-003). In API mode this is a real, unauthenticated server lookup (see
// `findPublishedBySlug` / `GET /api/public/:slug`) — signed-out visitors can
// load it, but it is not yet the sanitized "publications" snapshot the plan
// describes; it serves the full stored profile as-is.
export function PublicPortfolio() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [status, setStatus] = useState<'loading' | 'ready' | 'not-found'>('loading');
  const [cv, setCv] = useState<CVData | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    profileRepository.findPublishedBySlug(slug).then((match) => {
      if (cancelled) return;
      if (!match) { setStatus('not-found'); return; }
      setCv(match); setStatus('ready');
    }).catch(() => { if (!cancelled) setStatus('not-found'); });
    return () => { cancelled = true; };
  }, [slug]);

  // Deliberately one combined "not found" state for both "no such slug" and
  // "exists but unpublished" — an unauthenticated visitor shouldn't be able
  // to tell those apart (that would leak which slugs are claimed). Preview
  // an unpublished portfolio from the builder tab instead of this route.
  if (status === 'loading') return <main className="public-status"><p>Loading portfolio…</p></main>;
  if (status === 'not-found') return <main className="public-status"><h1>Portfolio not found</h1><p>No published portfolio exists at this address.</p><Link to="/">Go home</Link></main>;
  return <PortfolioPage cv={cv!} />;
}
