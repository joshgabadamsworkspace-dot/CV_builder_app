import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, migrateProfile } from './schema';

// The pre-portfolio, schemaVersion:1 shape — no `portfolio` field, skills
// without proficiency, projects without sector/tags.
const legacyV1 = {
  schemaVersion: 1,
  version: 1,
  id: 'legacy-1',
  profileName: 'Legacy Profile',
  updatedAt: '2024-01-01T00:00:00.000Z',
  personal: { fullName: 'Ada Lovelace', email: 'ada@example.com', phone: '000' },
  summary: { headline: 'Engineer', text: 'Summary text' },
  location: {},
  experiences: [],
  education: [],
  certifications: [],
  skills: [
    { id: 's1', name: 'Python', level: 'Advanced', order: 0 },
    { id: 's2', name: 'SQL', order: 1 },
  ],
  hobbies: [],
  references: [],
  projects: [
    { id: 'p1', title: 'Dashboard', subtitle: 'Power BI', url: 'http://example.com/dashboard', order: 0 },
  ],
  settings: { primary: '#1739b6', sections: [] },
};

describe('migrateProfile', () => {
  it('bumps schemaVersion and backfills portfolio defaults on legacy v1 data', () => {
    const migrated = migrateProfile(legacyV1);
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.portfolio.services.length).toBeGreaterThan(0);
    expect(migrated.portfolio.sections.hero).toBe(true);
  });

  it('maps skill level to a default proficiency when none is set, and clamps out-of-range values', () => {
    const migrated = migrateProfile(legacyV1);
    expect(migrated.skills.find((s) => s.id === 's1')?.proficiency).toBe(78); // Advanced
    expect(migrated.skills.find((s) => s.id === 's2')?.proficiency).toBe(55); // Intermediate default

    const overshoot = migrateProfile({ ...legacyV1, skills: [{ id: 's3', name: 'X', proficiency: 500, order: 0 }] });
    expect(overshoot.skills[0].proficiency).toBe(100);
  });

  it('defaults a project sector from subtitle and normalizes its URL to https', () => {
    const migrated = migrateProfile(legacyV1);
    const project = migrated.projects[0];
    expect(project.sector).toBe('Power BI');
    expect(project.url).toBe('https://example.com/dashboard');
  });

  it('normalizes item order to a dense, sorted sequence', () => {
    const withGaps = { ...legacyV1, skills: [
      { id: 'a', name: 'A', order: 9 },
      { id: 'b', name: 'B', order: 3 },
      { id: 'c', name: 'C', order: 7 },
    ] };
    const migrated = migrateProfile(withGaps);
    expect(migrated.skills.map((s) => s.id)).toEqual(['b', 'c', 'a']);
    expect(migrated.skills.map((s) => s.order)).toEqual([0, 1, 2]);
  });

  it('falls back to a safe default when the slug is reserved or empty', () => {
    expect(migrateProfile({ ...legacyV1, portfolio: { slug: 'dashboard' } }).portfolio.slug).toBe('my-portfolio');
    expect(migrateProfile({ ...legacyV1, portfolio: { slug: '   ' } }).portfolio.slug).toBe('my-portfolio');
  });

  it('normalizes a valid slug to lowercase-hyphenated form', () => {
    expect(migrateProfile({ ...legacyV1, portfolio: { slug: 'Joshua Gabriel!!' } }).portfolio.slug).toBe('joshua-gabriel');
  });

  it('is idempotent on already-current data', () => {
    const once = migrateProfile(legacyV1);
    const twice = migrateProfile(once);
    expect(twice).toEqual(once);
  });

  it('rejects a schema version newer than the app understands', () => {
    expect(() => migrateProfile({ ...legacyV1, schemaVersion: 99 })).toThrow(/newer version/);
  });

  it('rejects non-object input', () => {
    expect(() => migrateProfile(null)).toThrow();
    expect(() => migrateProfile('not a profile')).toThrow();
  });
});
