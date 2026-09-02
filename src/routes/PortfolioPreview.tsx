import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PortfolioPage } from '../components/portfolio/PortfolioPage';
import { profileRepository } from '../lib/activeRepository';
import { migrateProfile } from '../lib/schema';
import type { CVData } from '../types/cv';

function takePreviewSnapshot(profileId: string): CVData | null {
  const key = `portfolio-preview:${profileId}`;
  try {
    const raw = localStorage.getItem(key);
    localStorage.removeItem(key);
    if (!raw) return null;
    const profile = migrateProfile(JSON.parse(raw));
    return profile.id === profileId ? profile : null;
  } catch {
    return null;
  }
}

/** Full-size, owner-only preview. Unlike `/p/:slug`, this route can display an
 * unpublished draft and consumes the latest snapshot passed by the builder. */
export function PortfolioPreview() {
  const { profileId = '' } = useParams<{ profileId: string }>();
  const [cv, setCv] = useState<CVData | null>(() => takePreviewSnapshot(profileId));
  const [status, setStatus] = useState<'loading' | 'ready' | 'not-found'>(() => cv ? 'ready' : 'loading');

  useEffect(() => {
    if (cv?.id === profileId) return;
    let cancelled = false;
    profileRepository.get(profileId).then((profile) => {
      if (cancelled) return;
      setCv(profile);
      setStatus(profile ? 'ready' : 'not-found');
    }).catch(() => { if (!cancelled) setStatus('not-found'); });
    return () => { cancelled = true; };
  }, [cv?.id, profileId]);

  useEffect(() => {
    if (!cv) return;
    document.title = `${cv.personal.fullName || 'Portfolio'} — Full preview`;
  }, [cv]);

  if (status === 'loading') return <main className="public-status"><p>Loading full preview…</p></main>;
  if (status === 'not-found' || !cv) return <main className="public-status"><h1>Preview unavailable</h1><p>This portfolio could not be loaded.</p></main>;

  return <PortfolioPage cv={cv} />;
}
