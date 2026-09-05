# Classic Blue CV Builder

A local-first, layout-locked CV builder based on Joshua Gabriel's supplied CV. Career information is edited as structured data and rendered through one polished A4 template—there is no free-form canvas and no manual page redesign.

## Run locally

```bash
npm install
npm run dev
```

By default this persists profiles to the browser's IndexedDB — no server required. To persist to a real SQL database instead, see [Real database (optional)](#real-database-optional) below.

Create a production bundle with `npm run build`, then inspect it with `npm run preview`.

Run the tests with `npm test` (unit + component, Vitest — includes the API's own tests under `server/`), `npm run test:e2e` (Playwright, local-only mode, spins up its own dev server), and `npm run test:e2e:auth` (Playwright against the API-backed mode — starts both servers itself).

## What is included

- First-run landing page and multi-profile dashboard
- Live three-pane desktop builder and Edit / Preview / Theme mobile layout
- Personal details, summary, location, experience, education, certifications, skills, projects, interests, and references
- Drag-and-drop ordering for entries and complete sections
- Add, edit, duplicate, and remove controls for repeating content
- Section show/hide controls and optional section-level page breaks
- Classic Blue A4 renderer with semantic, entry-aware pagination
- Theme presets, custom accent colour, curated fonts, body size, three densities, and ATS mode
- IndexedDB autosave through Dexie
- Local PDF and DOCX text extraction with an import review step
- Versioned JSON profile import/export
- Browser print export with selectable text, links, colours, and A4 page breaks

Writing-assistance controls are deliberately suggestion-only. They explain that an AI provider must be connected; they never silently alter CV content.

## Architecture

The data flow is intentionally one-way:

```text
Editor → CVData JSON → template block model → paginator → A4 pages → print/PDF
```

- `src/types/cv.ts` is the central domain model.
- `src/lib/schema.ts` validates and migrates profile data (`migrateProfile`) — the only place `unknown` JSON becomes a trusted `CVData`.
- `src/store/useCVStore.ts` owns the selected CV and editor state.
- `src/lib/repository.ts` defines the `ProfileRepository` interface (list/get/save/remove/publish/unpublish) plus the IndexedDB-backed implementation; `src/lib/httpRepository.ts` is the SQL-backed implementation over `server/`'s API; `src/lib/activeRepository.ts` picks one based on `VITE_USE_API` — UI code always goes through this, never Dexie or `fetch` directly.
- `src/routes/` — `react-router-dom` routes: landing, dashboard, the CV/portfolio builder, and the public `/p/:slug` portfolio page.
- `src/data/sampleCV.ts` contains removable seed data based on the reference CV.
- `src/components/editor/Editor.tsx` contains structured section editors; `src/components/portfolio/` holds the My Portfolio editor and public page.
- `src/components/preview/CVDocument.tsx` converts data into semantic blocks, keeps entries together, paginates them, and renders the Classic Blue template.
- `src/lib/importCV.ts` extracts PDF/DOCX text locally and produces a reviewable draft.
- `server/` — a small Express API over SQLite (`node:sqlite`), used only when `VITE_USE_API=true`; `server/auth.ts` has the self-hosted email/password + session logic.
- `src/lib/auth.ts` / `src/store/useAuthStore.ts` / `src/routes/Login.tsx` / `src/routes/AuthGate.tsx` — the client side of that: a small fetch client, a Zustand store for session status, the sign-in/register screen, and the route guard that redirects signed-out visitors (all no-ops in the local-only build).

The renderer never reads form state. It only receives a valid `CVData` object.

## CV JSON format

Backups contain a complete `CVData` object with `schemaVersion: 2`. The top-level shape is:

```json
{
  "schemaVersion": 2,
  "version": 1,
  "id": "profile-id",
  "profileName": "Joshua Gabriel — General",
  "personal": {},
  "summary": {},
  "location": {},
  "experiences": [],
  "education": [],
  "certifications": [],
  "skills": [],
  "hobbies": [],
  "references": [],
  "projects": [],
  "settings": {},
  "portfolio": {}
}
```

Anything read from outside the store (a JSON import, an API/IndexedDB record) goes through `migrateProfile()` (`src/lib/schema.ts`) first — it backfills `schemaVersion: 1` data additively (portfolio defaults, skill proficiency, project sector/tags), validates the result, and never casts raw JSON straight to `CVData`. Keep future migrations additive and preserve hidden-section content.

## Real database (optional)

By default the app is local-only (IndexedDB, no server). To persist to a real SQL database instead:

```bash
cp .env.example .env.local   # sets VITE_USE_API=true
npm run dev:all              # runs Vite and the API together
```

`npm run dev:all` starts the Vite dev server (proxying `/api/*` to it) and a small Express API (`server/`) backed by SQLite via Node's built-in `node:sqlite` — the database file is created at `server/data/portfolio.db` on first run. `npm run server` runs just the API on its own (default port `8787`, override with `PORT`).

This mode requires an account: visiting `/` routes to `/login` if you're signed out. Auth is self-hosted (email + password, `server/auth.ts`) — scrypt-hashed passwords, opaque session tokens (hashed before storage) in an HTTP-only cookie, no third-party provider. Every profile is owned by the account that created it and every `/api/profiles` route is scoped to that owner (cross-owner access returns 404, not 403 or the other user's data). `GET /api/public/:slug` is the one deliberate exception — it's unauthenticated by design, since the public portfolio page has to work for signed-out visitors; it returns the same 404 for "no such slug" and "exists but unpublished" so it can't be used to enumerate claimed slugs.

Deploying this mode anywhere but localhost means deploying `server/` alongside the static build — a static host alone (Vercel/Netlify/GitHub Pages) only serves the default local-only mode. Slugs are not yet globally unique across accounts (see `docs/portfolio/PROGRESS.md`, Phase 3) — that's still open.

## PDF export

`Download PDF` opens the browser's native print dialog. Dedicated print CSS removes the application shell, resets preview zoom, emits exact `210mm × 297mm` pages, preserves vector text/icons and hyperlinks, and asks the browser to retain colours. Select **Save as PDF**, A4, 100% scale, and no browser headers/footers.

For centralized production rendering, pass the same print route and profile JSON to Playwright or Puppeteer and call `page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })`. Screenshot-based PDF generation is intentionally avoided.

## CV import

PDF extraction uses PDF.js; DOCX extraction uses Mammoth. Both run in the browser. The importer detects likely contact information and skills, creates a draft, and requires explicit review before saving. The current parser is deliberately conservative; more section-specific heuristics can be added without changing the renderer.

## Adding another template

1. Create a renderer beside `CVDocument.tsx` that accepts only `CVData`.
2. Reuse the same semantic block and pagination contract.
3. Put all visual choices behind theme tokens—do not add free-positioned editor state.
4. Add a stable template identifier to settings and a renderer registry.
5. Verify screen preview and print output against the same fixtures.

## Deployment

In the default local-only mode, the application is static after `npm run build`. Deploy `dist/` to Vercel, Netlify, Cloudflare Pages, GitHub Pages, or any static host. Configure the host to serve `index.html` as the SPA fallback (needed for the client-side routes — `/dashboard`, `/builder/...`, `/p/:slug`). No server or environment variables are required. See [Real database (optional)](#real-database-optional) for what changes if `VITE_USE_API` is enabled.

Personal data remains in the current browser's IndexedDB unless the user explicitly downloads a JSON backup or uploads a document.

### Publishing the personal homepage

The homepage reads `src/data/publishedPortfolio.json`, not browser storage. To
refresh it from the most recently updated published profile in the local SQLite
database, start the local app with `npm run dev:all`, publish the intended
profile, and then run:

```bash
npm run export:portfolio
npm run build
```

The export also moves embedded profile/project images into
`public/portfolio-assets/` and converts them to optimized WebP files when
`cwebp` is installed. Commit the generated JSON and assets to deploy the update.

## Planned My Portfolio extension

The audited end-to-end plan, implementation prompt, and shared progress ledger are in:

- [`docs/portfolio/IMPLEMENTATION_PLAN.md`](docs/portfolio/IMPLEMENTATION_PLAN.md)
- [`docs/portfolio/BUILD_PROMPT.md`](docs/portfolio/BUILD_PROMPT.md)
- [`docs/portfolio/PROGRESS.md`](docs/portfolio/PROGRESS.md)
