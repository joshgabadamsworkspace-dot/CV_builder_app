import { describe, expect, it } from 'vitest';
import publishedPortfolio from './publishedPortfolio.json';
import { migrateProfile } from '../lib/schema';

describe('published portfolio data', () => {
  it('is valid, published, and references deployable image assets', () => {
    const profile = migrateProfile(publishedPortfolio);

    expect(profile.personal.fullName).toBe('Joshua Gabriel');
    expect(profile.portfolio.published).toBe(true);
    expect(profile.portfolio.heroImage).toMatch(/^\/portfolio-assets\//);
    expect(profile.portfolio.aboutImage).toMatch(/^\/portfolio-assets\//);
    expect(profile.projects.filter((project) => project.image)).not.toHaveLength(0);
    expect(JSON.stringify(profile)).not.toContain('data:image/');
  });
});
