import type { Project } from '../types/cv';

/** The category a project's filter chip/badge shows — falls back through
 *  sector → subtitle → a generic label so older projects without a sector
 *  still render sensibly. */
export function projectSector(project: Project): string {
  return project.sector || project.subtitle || 'Projects';
}

/** Distinct sector chips for the project filter bar, "All" first, in the
 *  order each sector first appears among the (already order-sorted) projects. */
export function deriveSectors(projects: Project[]): string[] {
  return ['All', ...Array.from(new Set(projects.map(projectSector)))];
}

export function filterProjectsBySector(projects: Project[], sector: string): Project[] {
  return sector === 'All' ? projects : projects.filter((project) => projectSector(project) === sector);
}
