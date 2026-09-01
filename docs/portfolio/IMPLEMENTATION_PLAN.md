# My Portfolio — End-to-End Implementation Plan

Status: planning complete; implementation not started  
Owner slug: `joshgabadams`  
Figma source: `rxvceJK1THg9VCIqJACb2Q`, frame `1:1568` (`Light Design`)

## 1. Outcome

Add **My Portfolio** as a first-class builder tab that uses the same CV profile as the existing editor and publishes a responsive public portfolio at:

```text
https://<production-host>/p/joshgabadams
```

The authenticated builder edits one shared profile. CV fields populate the portfolio automatically; portfolio-only fields (images, services, testimonials, section copy, visibility, and project media) extend that profile. Once a portfolio is published, later saved changes become visible without a new application deployment.

## 2. Current-state audit

The current repository is a React 18 + TypeScript + Vite SPA. It has:

- a landing page, local profile dashboard, and three-pane CV editor;
- a single `CVData` v1 domain object in `src/types/cv.ts`;
- Zustand state and debounced autosave;
- IndexedDB persistence through Dexie;
- a CV theme containing colors, fonts, sizing, spacing, and ATS options;
- structured skills and projects, but projects do not currently expose URL, sector, image, or fetched preview controls in the editor;
- no automated tests beyond TypeScript compilation.

It does not yet have:

- real routes (screen state is local to `App.tsx`);
- login, user ownership, cloud persistence, or cross-device synchronization;
- object storage for images;
- a public portfolio read model;
- server-side metadata for public portfolio links;
- a safe server endpoint for project URL previews;
- deployment configuration or environment-variable contracts.

This means “live portfolio” is a product/architecture addition, not only a new visual component.

## 3. Figma translation

The inspected source frame is 1920 × 5539 and contains:

1. navigation with brand, section anchors, and CV download;
2. hero with name, professional headline, summary, CTA, main portrait, and social links;
3. about section with a second portrait and four proficiency bars;
4. four service cards;
5. project filters and a three-column project grid;
6. a horizontally staged testimonial carousel;
7. contact CTA;
8. full footer with navigation, social links, and copyright.

Source typography is Poppins and the reference accent is `#FF6300`. Do not hard-code that orange in implementation. Map the design to shared semantic tokens:

```css
--portfolio-accent: var(--cv-primary);
--portfolio-heading: var(--cv-heading);
--portfolio-text: var(--cv-text);
--portfolio-muted: var(--cv-muted);
--portfolio-font-heading: var(--cv-heading-font);
--portfolio-font-body: var(--cv-body-font);
```

Derive tint tokens from the selected accent with `color-mix()` plus tested fallbacks. Keep the composition and hierarchy of the Figma frame, while replacing fixed pixel widths with a `max-width` content container and fluid spacing.

## 4. Product model

### 4.1 Navigation and screens

Replace local `screen` switching with real application routes:

```text
/                         landing
/dashboard                authenticated profile dashboard
/builder/:profileId/cv    CV builder
/builder/:profileId/portfolio   portfolio builder
/p/:slug                  public portfolio
/p/:slug/projects/:projectId    optional project detail/redirect surface
```

Desktop builder header tabs:

- **CV Builder**
- **My Portfolio**

The portfolio builder keeps the existing shell language. Its top-right actions are:

- publication status (`Draft`, `Publishing`, `Live`, `Publish error`);
- **Preview site**;
- **Copy URL** (disabled until the first successful publish);
- **Publish** / **Unpublish**.

On mobile, use `Content`, `Preview`, and `Theme` tabs for the portfolio editor. The public portfolio must not inherit builder chrome.

### 4.2 Shared versus portfolio-only content

Shared CV fields remain the source of truth:

| Portfolio area | CV source |
| --- | --- |
| brand/name | `personal.fullName` |
| role | `summary.headline` |
| hero/about copy | `summary.text` with optional portfolio overrides |
| social links | `personal.linkedIn`, `github`, `website`, `whatsapp` plus added social fields |
| skills | `skills[]` |
| project title/summary/URL | `projects[]` |
| downloadable CV | generated from the active profile |
| contact details | `personal.email`, phone, location |
| colors/fonts | `settings` theme values |

Portfolio-only content:

- slug, visibility, SEO title/description, publish timestamps;
- main portrait and about portrait;
- navigation/section visibility and custom section intros;
- skill proficiency percentage and featured flag;
- service cards;
- project sector/tags, media, preview metadata, featured flag;
- testimonials;
- contact CTA copy and footer copy.

### 4.3 Domain types and migration

Move from `schemaVersion: 1` to `schemaVersion: 2` through an explicit additive migration. Never cast old JSON directly to v2.

Suggested type shape:

```ts
interface MediaAsset {
  id: string;
  storageKey: string;
  alt: string;
  width?: number;
  height?: number;
  focalPoint?: { x: number; y: number };
}

interface PortfolioSettings {
  slug: string;
  published: boolean;
  publishedAt?: string;
  seoTitle?: string;
  seoDescription?: string;
  heroImage?: MediaAsset;
  aboutImage?: MediaAsset;
  heroSummaryOverride?: string;
  aboutSummaryOverride?: string;
  sectionIntros: Partial<Record<PortfolioSectionKey, string>>;
  sections: PortfolioSectionSetting[];
  services: Service[];
  testimonials: Testimonial[];
  contactHeading?: string;
  contactBody?: string;
  footerNote?: string;
}
```

Extend:

- `Skill` with `proficiency?: number` and `featured?: boolean`;
- `Project` with `sector?: string`, `tags?: string[]`, `url?: string`, `media?: MediaAsset[]`, `preview?: LinkPreview`, and `featured?: boolean`;
- `PersonalInfo` with only the social links actually rendered.

Validation rules:

- slug: lowercase letters, numbers, and single hyphens; reserve system paths;
- proficiency: integer 0–100;
- all external URLs normalized to `https:` where possible;
- required alt text for meaningful images;
- section and item orders normalized after drag/drop;
- imported v1 profiles receive safe defaults and preserve every existing field.

## 5. Full-stack architecture

### 5.1 Data boundary

Introduce a repository interface so UI code is not coupled to Dexie or a particular cloud vendor:

```ts
interface ProfileRepository {
  list(): Promise<CVData[]>;
  get(id: string): Promise<CVData | null>;
  save(profile: CVData, expectedVersion?: number): Promise<CVData>;
  remove(id: string): Promise<void>;
  publish(id: string): Promise<PublishedPortfolio>;
  unpublish(id: string): Promise<void>;
}
```

Use cloud persistence after authentication. Keep IndexedDB as a cache/offline draft store, not the authoritative live source. Queue unsynchronized saves and expose conflict/error state instead of silently overwriting a newer server version.

### 5.2 Recommended backend capabilities

The backend must provide:

- email/OAuth authentication;
- relational profile data or a validated JSON document with optimistic versioning;
- row-level owner authorization;
- public read access only to explicitly published portfolio snapshots;
- private object storage for drafts and public/CDN access for published images;
- a server/edge function for project URL metadata extraction;
- audit timestamps and soft-delete/recovery policy.

A Supabase implementation is suitable (Auth, Postgres, Storage, RLS, Edge Functions), but keep the repository and API contracts vendor-neutral so hosting can change.

### 5.3 Suggested tables

```text
users/auth identities       managed by auth provider
profiles                    id, owner_id, name, schema_version, version, data_json, updated_at
portfolio_publications      profile_id, slug, snapshot_json, published_at, updated_at
media_assets                id, owner_id, profile_id, storage_key, mime, width, height, created_at
link_previews               normalized_url, title, description, image_url, site_name, fetched_at, status
```

`slug` is globally unique. The public route reads only `portfolio_publications.snapshot_json`; it never exposes private drafts or owner identifiers.

### 5.4 Save and publish behavior

```text
Editor change
  -> update Zustand immediately
  -> persist offline cache
  -> debounce cloud save with expected version
  -> refresh publication snapshot when portfolio is already live
  -> invalidate/revalidate /p/:slug
```

The first publish is explicit. After that, successful autosaves update the public snapshot automatically. Show the last published time and any pending/failed sync. A failed upload or cloud save must not replace the last known-good public snapshot.

## 6. Builder UX

### 6.1 Portfolio editor sections

Use a left navigation specific to the portfolio:

1. Overview & publishing
2. Hero
3. About me
4. Skills
5. Services
6. Projects
7. Testimonials
8. Contact & footer
9. Sections
10. Theme & motion

The center panel contains structured forms. The right pane renders the actual responsive public component, with desktop/tablet/mobile viewport controls.

### 6.2 Image panels

Create accessible upload cards with these exact labels:

- **Upload your main picture**
- **Upload your About Me picture**

Each card supports click, drag/drop, keyboard activation, local preview, replace, remove, alt text, crop/focal point, progress, validation errors, and recommended dimensions. Accept JPEG, PNG, and WebP; normalize orientation; generate responsive derivatives; enforce file and pixel limits.

Do not store image base64 in `CVData` or IndexedDB profile JSON. Store asset references.

### 6.3 Skills

Render featured skills as animated progress bars. Map legacy levels to defaults only during migration:

```text
Beginner 35, Intermediate 55, Advanced 78, Expert 92
```

Let the owner override exact percentages. The builder skill list is vertically scrollable with a sticky add/search toolbar. The public section should use a bounded scroll region only when the selected template calls for it; on small screens, preserve page scrolling and avoid nested horizontal traps.

### 6.4 Services

Services are portfolio-specific CRUD items with `title`, `description`, `iconKey`, `order`, and `enabled`. Use one icon family (Lucide) with consistent stroke width, optical size, container, and accent color. Do not allow arbitrary uploaded icons in v1.

### 6.5 Projects and URL previews

Project filters come from normalized project `sector` values. Tags come from the project editor and are not inferred from arbitrary prose at render time.

The project URL field triggers a debounced server request. The server fetches Open Graph/Twitter metadata, stores a sanitized result, and returns a preview card with title, description, site, image, and host. The owner can refresh metadata or override it with uploaded media.

Security requirements for URL fetching:

- allow only `http`/`https`, then prefer `https`;
- resolve DNS and reject loopback, link-local, private, metadata, and reserved IP ranges before every redirect;
- limit redirects, response bytes, content types, and total timeout;
- sanitize text and never render remote HTML;
- proxy/cache allowed images or validate them independently;
- rate-limit by user and normalized URL.

Clicking a project opens the attached URL in a new tab with safe `rel` attributes, or an internal detail view if that option is enabled.

### 6.6 Testimonials

Authenticated owners can create, edit, reorder, hide, and delete testimonials with name, role/company, quote, avatar, and consent/source note. The public carousel supports swipe, keyboard arrows, buttons with labels, pagination indicators, pause-on-hover/focus, and reduced-motion behavior. Do not auto-rotate while focused.

Public testimonial submissions are out of scope for the first release unless a moderation and consent workflow is added.

## 7. Public portfolio implementation

Build semantic section components instead of one monolith:

```text
PortfolioPage
  PortfolioNav
  HeroSection
  AboutSection
  ServicesSection
  ProjectsSection
  TestimonialsSection
  ContactSection
  PortfolioFooter
```

Requirements:

- sticky navigation with active-section state and an accessible mobile menu;
- fluid type/spacing with no fixed 1920px assumptions;
- breakpoints validated at 360, 390, 768, 1024, 1440, and 1920 widths;
- responsive images with explicit dimensions to prevent layout shift;
- empty sections omitted cleanly;
- loading, unpublished, not-found, and error states;
- server-generated title, description, canonical URL, Open Graph image, and structured data;
- email links and contact CTA should not expose a writable server endpoint unless abuse protection is implemented.

### Motion

Use short, purposeful transitions:

- hero content and image stagger on first view;
- section reveal through Intersection Observer;
- progress bars animate once when visible;
- project cards lift subtly and reveal metadata;
- filter changes cross-fade/reflow;
- carousel uses transform/opacity transitions.

Honor `prefers-reduced-motion`, avoid scroll-jacking, keep animations GPU-friendly, and prevent content from being hidden when JavaScript or observation fails.

## 8. Accessibility, privacy, and quality gates

- WCAG 2.2 AA contrast for every generated theme; warn or auto-correct unsafe combinations.
- Logical headings, landmarks, focus order, skip link, visible focus, alt text, and labelled carousel controls.
- Full keyboard operation for navigation, filters, upload panels, and carousel.
- Authentication and row-level authorization tested separately from UI visibility.
- Published snapshots contain only allowlisted public fields.
- Image deletion includes reference checks and a recoverable grace period.
- Copy URL uses Clipboard API with fallback and visible success/error feedback.
- No secret keys in Vite `VITE_*` variables; privileged operations stay server-side.

Performance budgets for the public route:

- no builder/editor packages in the public chunk;
- lazy-load carousel and below-fold project media;
- compressed responsive images and font subsets;
- target LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms on representative mobile throttling;
- Lighthouse accessibility, best-practices, and SEO scores ≥ 95 before release.

## 9. Test plan

### Unit

- v1 → v2 migration and validation;
- skill-level percentage mapping;
- slug normalization/reserved paths;
- theme token/tint generation and contrast validation;
- project sector filter derivation;
- public snapshot allowlist;
- URL normalization and SSRF rejection helpers.

### Component

- image upload cards and failures;
- copy URL states;
- project filters/cards;
- testimonial carousel keyboard/reduced-motion behavior;
- missing/hidden section rendering;
- responsive navigation.

### Integration

- authenticated save with optimistic concurrency;
- publish/unpublish and public read isolation;
- live published-snapshot refresh after CV edits;
- storage upload/replace/remove;
- URL metadata fetch success, timeout, redirect, invalid HTML, and blocked IP cases.

### End-to-end

1. sign in;
2. open a CV and switch to My Portfolio;
3. upload both portraits;
4. edit a CV skill and verify the portfolio preview updates;
5. add a project URL and verify its preview;
6. publish `joshgabadams`;
7. copy and visit the public URL while signed out;
8. edit the CV and verify the live portfolio changes;
9. validate desktop, tablet, and mobile views;
10. unpublish and verify the public route no longer exposes content.

## 10. Delivery phases

### Phase 0 — Foundation

- add routing and route-level code splitting;
- split `App.tsx` into screens/layouts;
- add schema v2, Zod validation, and migrations;
- introduce repository interfaces and save-state model;
- add unit-test and browser-test harnesses.

Exit: existing CV builder behavior passes regression checks through real routes.

### Phase 1 — Portfolio UI with local data

- add My Portfolio tab and editor navigation;
- implement portfolio types/defaults and structured editors;
- implement upload-card UI with temporary local asset adapter;
- build all public section components and responsive preview;
- wire shared CV theme and shared fields.

Exit: complete local portfolio preview matches the Figma hierarchy at all target widths.

### Phase 2 — Cloud identity and synchronization

- add auth, owner-scoped database, RLS/authorization, and storage;
- migrate local profiles after explicit user confirmation;
- implement offline cache, optimistic versioning, and conflict UI;
- upload/process images and persist asset references.

Exit: the same profile is available across authenticated sessions/devices without exposing private data.

### Phase 3 — Publishing and project previews

- implement unique slug reservation and `joshgabadams` seed/claim;
- create sanitized public snapshots and `/p/:slug` read path;
- add Copy URL, publish status, publish/unpublish;
- add secure link-preview function and project card metadata;
- generate SEO/social metadata and public CV download.

Exit: signed-out users can visit the live portfolio, and subsequent successful CV saves update it automatically.

### Phase 4 — Motion, hardening, and release

- add accessible motion and carousel behavior;
- complete unit/component/integration/E2E tests;
- run security, accessibility, responsive, and performance audits;
- configure production environment, monitoring, backups, and rollback;
- deploy staging, obtain visual approval, then promote to production.

Exit: all quality gates pass and rollback has been rehearsed.

## 11. Definition of done

- My Portfolio is reachable as a builder tab for the active CV profile.
- The public portfolio follows the supplied Figma hierarchy and is fully responsive.
- CV content and theme changes propagate to the live portfolio after successful save.
- The owner can upload/replace both required portraits and manage portfolio-only content.
- Skills use progress bars; projects filter by sector and support safe URL previews.
- Testimonials are full CRUD for the authenticated owner and accessible publicly.
- Copy URL copies the canonical `joshgabadams` URL with clear feedback.
- Published/private authorization is proven by tests.
- SEO, accessibility, motion preferences, error states, and performance budgets pass.
- Documentation, migrations, environment examples, operations, and rollback notes are current.

## 12. Explicit non-goals for the first release

- public testimonial submissions without moderation;
- arbitrary custom JavaScript/CSS from users;
- arbitrary service icon uploads;
- a general-purpose website/page builder;
- silently publishing a profile before the owner’s first explicit publish action.

