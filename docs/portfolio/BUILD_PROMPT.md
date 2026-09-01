# Universal Build Prompt — My Portfolio

Use this prompt for an implementation agent. It is intentionally tied to repository contracts and acceptance criteria rather than a specific backend SDK.

---

You are implementing **My Portfolio** end to end in the existing `CV_builder_app` repository.

Read, in order:

1. `README.md`
2. `docs/portfolio/IMPLEMENTATION_PLAN.md`
3. `docs/portfolio/PROGRESS.md`
4. `src/types/cv.ts`
5. `src/store/useCVStore.ts`
6. `src/App.tsx`
7. `src/components/editor/Editor.tsx`
8. `src/components/preview/CVDocument.tsx`
9. `src/lib/db.ts`
10. `src/styles.css`

Inspect git status before editing. Preserve unrelated user work. Update `docs/portfolio/PROGRESS.md` at the beginning and end of every phase with exact files changed, migrations applied, commands run, results, risks, and the next safe step. Never mark a gate complete without evidence.

## Goal

Add a **My Portfolio** builder tab synchronized with the active CV and publish a live, responsive portfolio at `/p/joshgabadams`. Use the supplied Figma file `rxvceJK1THg9VCIqJACb2Q`, node `1:1568`, as the visual hierarchy: nav, hero, about with progress bars, services, filterable projects, testimonial carousel, contact CTA, and footer.

The public page must use the CV theme’s colors and fonts. The Figma orange is only the reference/default accent. All CV-sourced edits update the local preview immediately. After the owner’s first explicit publish, successful cloud saves refresh the public snapshot automatically without a new application deployment.

## Non-negotiable architecture

- Introduce real routes and route-level code splitting; do not keep adding screen branches to `App.tsx`.
- Upgrade profile data with a validated additive schema migration. Preserve v1 imports and existing IndexedDB data.
- Put persistence behind repository interfaces. IndexedDB becomes cache/offline draft storage; authenticated cloud data is authoritative.
- Public routes read sanitized published snapshots only, never authenticated drafts.
- Keep privileged keys and URL fetching on the server.
- Do not put base64 images in the CV JSON.
- Use shared semantic theme tokens for CV and portfolio.
- Keep the public bundle free of editor, drag/drop, PDF-import, and builder-only dependencies.
- Use consistent Lucide service icons.

## Required UX

- Builder header tabs: **CV Builder** and **My Portfolio**.
- Portfolio builder top-right: status, Preview site, **Copy URL**, Publish/Unpublish.
- Builder sections: Overview & publishing, Hero, About me, Skills, Services, Projects, Testimonials, Contact & footer, Sections, Theme & motion.
- Image upload panels labelled exactly **Upload your main picture** and **Upload your About Me picture**, including preview, progress, replace/remove, alt text, validation, and focal point/crop behavior.
- Skill editor is scrollable with search/add controls; public skills use animated progress bars.
- Project filters derive from explicit sector fields. A project URL produces a sanitized mini preview card from server-fetched metadata and opens safely.
- Testimonials support authenticated CRUD/reorder/hide and an accessible swipe/keyboard carousel.
- Public navigation is sticky, responsive, anchor-aware, and keyboard accessible.
- All motion honors `prefers-reduced-motion` and never hides content when animation code fails.

## Security and data rules

- Enforce owner authorization and public/private separation on the server/database, not only in React.
- Use optimistic versioning for saves and show conflicts/errors.
- Validate slugs and reserve system routes; claim `joshgabadams` for the intended profile.
- For URL previews, reject private/reserved IPs before each redirect, restrict protocols/content types/size/time/redirects, sanitize output, and rate-limit.
- Publish only allowlisted fields. Do not expose owner IDs, drafts, storage internals, or private fields.
- Validate upload MIME by content, limit file/pixel size, normalize images, and generate responsive outputs.

## Implementation order

1. Establish baseline: typecheck/build existing app and record results.
2. Add router, screen/layout extraction, schema v2, migration tests, repository contracts, and test harnesses.
3. Add portfolio domain defaults/editor UI and responsive public components using local data.
4. Add shared semantic theme tokens and confirm CV theme edits affect the portfolio.
5. Add authenticated cloud persistence, row-level authorization, storage, offline cache, optimistic concurrency, and local-profile migration flow.
6. Add publish/unpublish, unique slug, public snapshot route, Copy URL, SEO/social metadata, and downloadable CV.
7. Add secure project URL preview ingestion and project filters/cards.
8. Finish testimonials, motion, empty/error/loading states, and responsive/a11y behavior.
9. Run all unit/component/integration/E2E, security, visual, accessibility, and performance checks.
10. Deploy staging, verify signed-out public access and automatic live refresh, then promote with a documented rollback.

## Verification matrix

At minimum, run and record:

- formatting/linting/typecheck/build;
- schema migration unit tests;
- repository and public-snapshot integration tests;
- authorization tests for owner A, owner B, anonymous draft read, published read, update, and delete;
- URL preview SSRF/redirect/timeout/oversize/malformed cases;
- browser E2E for sign-in → edit → upload → publish → copy → signed-out view → CV edit → live update → unpublish;
- keyboard-only and reduced-motion checks;
- visual snapshots at 360, 390, 768, 1024, 1440, and 1920 widths;
- Lighthouse/performance budgets from the plan.

## Completion contract

Do not report completion until every item in the plan’s Definition of Done is evidenced in `PROGRESS.md`. If credentials, DNS, provider setup, or product choices block a phase, finish all safe local work, write the exact blocker and required user action, and stop without faking a deployment. Never commit secrets. Provide a concise handoff with changed files, migrations, commands/results, live/staging URLs, known limitations, and rollback steps.

---

