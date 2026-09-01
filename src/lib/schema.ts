import { z } from 'zod';
import { createPortfolioDefaults, levelToProficiency } from '../data/portfolioDefaults';
import type { CVData, PortfolioSettings, Project, Skill, SkillLevel } from '../types/cv';

export const CURRENT_SCHEMA_VERSION = 2;

const RESERVED_SLUGS = new Set(['p', 'builder', 'dashboard', 'api', 'admin', 'app', 'assets', 'static']);

// Mirrors src/types/cv.ts closely enough to catch structurally broken input
// (missing/malformed required fields) without re-declaring every optional
// string field — this is a trust-boundary check, not the type source of truth.
const orderedItem = z.object({ id: z.string(), order: z.number() }).passthrough();

const portfolioSettingsSchema = z.object({
  slug: z.string(), published: z.boolean(), publishedAt: z.string().optional(),
  heroImage: z.string().optional(), heroImageAlt: z.string(), aboutImage: z.string().optional(), aboutImageAlt: z.string(),
  heroSummary: z.string().optional(), aboutSummary: z.string().optional(),
  servicesIntro: z.string().optional(), projectsIntro: z.string().optional(), testimonialsIntro: z.string().optional(),
  contactHeading: z.string(), contactBody: z.string(), footerNote: z.string().optional(),
  sections: z.object({ hero: z.boolean(), about: z.boolean(), services: z.boolean(), projects: z.boolean(), testimonials: z.boolean(), contact: z.boolean() }),
  services: z.array(z.object({ id: z.string(), title: z.string(), description: z.string(), icon: z.enum(['layout', 'code', 'smartphone', 'chart']), order: z.number() })),
  testimonials: z.array(z.object({ id: z.string(), name: z.string(), role: z.string().optional(), company: z.string().optional(), quote: z.string(), avatar: z.string().optional(), visible: z.boolean(), order: z.number() })),
});

const cvDataSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  version: z.number(),
  id: z.string().min(1),
  profileName: z.string(),
  updatedAt: z.string(),
  personal: z.object({ fullName: z.string(), email: z.string(), phone: z.string() }).passthrough(),
  summary: z.object({ headline: z.string().optional(), text: z.string().optional() }),
  location: z.record(z.string(), z.string().optional()),
  experiences: z.array(orderedItem),
  education: z.array(orderedItem),
  certifications: z.array(orderedItem),
  skills: z.array(orderedItem.extend({ proficiency: z.number().min(0).max(100).optional() })),
  hobbies: z.array(orderedItem),
  references: z.array(orderedItem),
  projects: z.array(orderedItem.extend({ url: z.string().optional() })),
  settings: z.object({ primary: z.string(), sections: z.array(z.object({ key: z.string(), label: z.string(), enabled: z.boolean() }).passthrough()) }).passthrough(),
  portfolio: portfolioSettingsSchema,
});

/** Turns arbitrary/unknown input (freshly parsed JSON, an IndexedDB record,
 *  legacy schemaVersion 1 data) into a validated, fully-defaulted schemaVersion 2
 *  `CVData` — additively, never by casting the raw input straight to `CVData`.
 *  Idempotent: safe to run again on data that's already valid. */
export function migrateProfile(raw: unknown): CVData {
  if (typeof raw !== 'object' || raw === null) throw new Error('This file is not a valid CV profile.');
  const input = raw as Record<string, unknown>;
  const version = typeof input.schemaVersion === 'number' ? input.schemaVersion : 1;
  if (version > CURRENT_SCHEMA_VERSION) throw new Error('This profile was created with a newer version of the app. Please update the app before opening it.');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const draft = structuredClone(input) as Record<string, any>;

  const defaults = createPortfolioDefaults();
  const existingPortfolio = (draft.portfolio ?? {}) as Partial<PortfolioSettings> & Record<string, unknown>;
  draft.portfolio = {
    ...defaults, ...existingPortfolio,
    sections: { ...defaults.sections, ...((existingPortfolio.sections as object | undefined) ?? {}) },
    services: (existingPortfolio.services as unknown[] | undefined)?.length ? existingPortfolio.services : defaults.services,
    testimonials: (existingPortfolio.testimonials as unknown[] | undefined)?.length ? existingPortfolio.testimonials : defaults.testimonials,
  };
  draft.portfolio.slug = normalizeSlug(draft.portfolio.slug);
  draft.portfolio.services = normalizeOrder(draft.portfolio.services);
  draft.portfolio.testimonials = normalizeOrder(draft.portfolio.testimonials);

  draft.skills = normalizeOrder((Array.isArray(draft.skills) ? draft.skills : []).map((skill: Partial<Skill>) => ({
    ...skill, proficiency: clampProficiency(skill.proficiency ?? levelToProficiency[(skill.level as SkillLevel) ?? 'Intermediate']),
  })));
  draft.projects = normalizeOrder((Array.isArray(draft.projects) ? draft.projects : []).map((project: Partial<Project>) => ({
    ...project, sector: project.sector ?? project.subtitle ?? 'Projects', tags: Array.isArray(project.tags) ? project.tags : [],
    url: project.url ? toHttps(project.url) : project.url,
  })));
  for (const key of ['experiences', 'education', 'certifications', 'hobbies', 'references'] as const) {
    draft[key] = normalizeOrder(Array.isArray(draft[key]) ? draft[key] : []);
  }

  draft.schemaVersion = CURRENT_SCHEMA_VERSION;
  draft.version = typeof draft.version === 'number' ? draft.version : 1;
  draft.id = typeof draft.id === 'string' && draft.id ? draft.id : crypto.randomUUID();
  draft.updatedAt = typeof draft.updatedAt === 'string' ? draft.updatedAt : new Date().toISOString();

  const result = cvDataSchema.safeParse(draft);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(`This profile is missing required information${issue ? ` (${issue.path.join('.')}: ${issue.message})` : ''}. Please check the file and try again.`);
  }
  return draft as CVData;
}

function clampProficiency(value: number) { return Math.round(Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))); }
function normalizeSlug(value: unknown) {
  const raw = typeof value === 'string' ? value : '';
  const slug = raw.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return !slug || RESERVED_SLUGS.has(slug) ? 'my-portfolio' : slug;
}
function toHttps(url: string) { try { const parsed = new URL(url); if (parsed.protocol === 'http:') parsed.protocol = 'https:'; return parsed.toString(); } catch { return url; } }
function normalizeOrder<T extends { order?: number }>(items: T[]) { return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((item, order) => ({ ...item, order })); }
