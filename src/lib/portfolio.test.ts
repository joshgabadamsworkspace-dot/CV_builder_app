import { describe, expect, it } from 'vitest';
import { deriveSectors, filterProjectsBySector, projectSector } from './portfolio';
import type { Project } from '../types/cv';

const project = (overrides: Partial<Project> & { id: string }): Project => ({ title: 'Title', order: 0, ...overrides });

describe('projectSector', () => {
  it('prefers an explicit sector', () => { expect(projectSector(project({ id: '1', sector: 'Data', subtitle: 'SQL' }))).toBe('Data'); });
  it('falls back to subtitle when sector is missing', () => { expect(projectSector(project({ id: '1', subtitle: 'SQL' }))).toBe('SQL'); });
  it('falls back to a generic label when both are missing', () => { expect(projectSector(project({ id: '1' }))).toBe('Projects'); });
});

describe('deriveSectors', () => {
  it('lists distinct sectors with "All" first, in first-seen order', () => {
    const projects = [project({ id: '1', sector: 'Web' }), project({ id: '2', sector: 'Data' }), project({ id: '3', sector: 'Web' })];
    expect(deriveSectors(projects)).toEqual(['All', 'Web', 'Data']);
  });
});

describe('filterProjectsBySector', () => {
  const projects = [project({ id: '1', sector: 'Web' }), project({ id: '2', sector: 'Data' })];
  it('returns everything for "All"', () => { expect(filterProjectsBySector(projects, 'All')).toHaveLength(2); });
  it('filters to a single sector', () => { expect(filterProjectsBySector(projects, 'Data').map((p) => p.id)).toEqual(['2']); });
});
