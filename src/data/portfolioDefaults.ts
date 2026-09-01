import type { PortfolioSettings, SkillLevel } from '../types/cv';

export const levelToProficiency: Record<SkillLevel, number> = {
  Beginner: 35,
  Intermediate: 55,
  Advanced: 78,
  Expert: 92,
};

export function createPortfolioDefaults(slug = 'joshgabadams'): PortfolioSettings {
  return {
    slug,
    published: false,
    heroImageAlt: 'Professional portrait',
    aboutImageAlt: 'Portrait for the About Me section',
    servicesIntro: 'Practical digital services shaped around clear goals, thoughtful design, and measurable outcomes.',
    projectsIntro: 'A selection of products, dashboards, and experiences built across data, web, and product design.',
    testimonialsIntro: 'What collaborators and clients say about working together.',
    contactHeading: "Let's build something useful together",
    contactBody: 'Have a project, opportunity, or idea in mind? Send a message and let us start a conversation.',
    footerNote: 'All rights reserved.',
    sections: { hero: true, about: true, services: true, projects: true, testimonials: true, contact: true },
    services: [
      { id: 'service-1', title: 'Data Analytics', description: 'Dashboards, reporting systems, and decision-ready insights from complex data.', icon: 'chart', order: 0 },
      { id: 'service-2', title: 'Web Development', description: 'Responsive web experiences that are fast, accessible, and easy to maintain.', icon: 'code', order: 1 },
      { id: 'service-3', title: 'UI/UX Design', description: 'Clear product flows and polished interfaces grounded in real user needs.', icon: 'layout', order: 2 },
      { id: 'service-4', title: 'Product Support', description: 'Practical digital systems and ongoing improvements that help teams grow.', icon: 'smartphone', order: 3 },
    ],
    testimonials: [
      { id: 'testimonial-1', name: 'Add a testimonial', role: 'Client or collaborator', quote: 'Use the portfolio editor to replace this sample with a real recommendation.', visible: true, order: 0 },
    ],
  };
}

// Full migration + validation (schemaVersion bump, order/slug normalization,
// Zod validation) lives in `src/lib/schema.ts#migrateProfile` — this file only
// owns the portfolio-specific default content and the level→percent mapping
// that migration backfills onto legacy profiles.
