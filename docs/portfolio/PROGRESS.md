# My Portfolio — Deployment Progress

This is the shared handoff ledger for every implementation agent. Keep entries factual and append-only inside each phase; update checkboxes only with evidence.

## Project status

- Overall: **Phase 0 and Phase 1 complete. Phase 2: self-hosted auth (email/password) and owner-scoped CRUD are done and tested end-to-end against the SQLite backend, opt-in via `VITE_USE_API`. Object storage, offline cache/retry, and the local→cloud migration flow are still open.**
- Current phase: **Phase 2 — Cloud identity and synchronization (auth + ownership done; storage/offline/migration open)**
- Public slug: `joshgabadams`
- Production URL: not assigned
- Staging URL: not assigned
- Last updated: 2026-09-01

## Baseline evidence

- Git branch: `main`, tracking `origin/main`
- Worktree at audit: clean
- Stack: React 18, TypeScript 5.6, Vite 6, Zustand 5, Dexie 4
- Current persistence: IndexedDB only (`ClassicBlueCV`, schema v1)
- Current tests: no unit/component/E2E harness; TypeScript build scripts only
- Current hosting manifest: none found
- Figma inspected: file `rxvceJK1THg9VCIqJACb2Q`, node `1:1568`
- Figma frame: `Light Design`, 1920 × 5539
- Reference tokens: Poppins; accent `#FF6300`; tints `#FFCFB0`, `#FFB78A`, `#FFEFE6`, `#FF9654`

## Phase gates

### Phase 0 — Foundation

- [x] Baseline install/typecheck/build recorded
- [x] Real routing and route-level chunks added
- [x] Existing screens extracted without regression
- [x] `CVData` v2 and v1 migration implemented and tested
- [x] Repository contracts and explicit sync states added
- [x] Unit/component/E2E harnesses added

### Phase 1 — Local portfolio

- [x] My Portfolio tab and portfolio editor navigation added
- [x] Hero/about image panels added
- [x] Shared CV fields and theme synchronized
- [x] Skills/progress, services, projects, testimonials, contact, and footer editors added
- [x] Public components and responsive preview completed
- [x] Empty/loading/error states completed — empty-projects/empty-testimonials, builder loading/not-found, and public-route loading/not-found/unpublished states all implemented (the last three only became meaningful once real routing existed)
- [ ] Figma hierarchy visually approved at target widths — self-verified at 360/768/1024/1440/1920 against the real `/p/:slug` route (see Phase 0 work log); still needs an explicit human visual approval against Figma frame `1:1568` itself, which this session has no tool access to fetch

### Phase 2 — Cloud identity and synchronization

- [x] Auth implemented — self-hosted email/password (scrypt + hashed opaque session tokens in an HTTP-only cookie), not a third-party provider; see work log
- [x] Owner-scoped persistence and authorization policies implemented/tested — every `/api/profiles` route requires a session and is scoped to `owner_id`; cross-owner access returns 404 (not 403, not the data); tested both server-side (Supertest) and live in a real two-browser-context flow
- [ ] Storage and responsive image processing implemented — profiles (local and SQL-backed) still embed images as base64 in the JSON document, not object storage
- [ ] Local-profile migration flow implemented — a profile created in the local-only (Dexie) build has no path into an account yet
- [ ] Offline cache, retry, and a real conflict UI — optimistic concurrency (`expectedVersion`/409) is implemented and tested; offline cache, retry, and a real conflict UI (today a conflict just shows the generic "Unable to save" state) are still open

### Phase 3 — Publishing

- [ ] `joshgabadams` slug reserved/claimed
- [ ] Sanitized public snapshot flow implemented
- [ ] Publish/unpublish and status UI implemented
- [ ] Copy URL and public signed-out route implemented
- [ ] Automatic refresh after successful live-profile saves implemented
- [ ] Secure project URL preview service implemented/tested
- [ ] SEO, canonical, Open Graph, structured data, and public CV download implemented

### Phase 4 — Release

- [ ] Accessible motion and carousel verified
- [ ] Cross-browser/responsive/keyboard/reduced-motion checks passed
- [ ] Security and privacy checks passed
- [ ] Performance budgets passed
- [ ] Staging deployed and approved
- [ ] Production deployed
- [ ] Monitoring, backup, and rollback documented and rehearsed

## Work log

### 2026-09-01 — Self-hosted auth + owner-scoped profiles (Phase 2)

Requested: "phase 2 lets go", then asked to choose between self-hosted auth on the current stack, Supabase, or a managed auth provider + current stack — chose **self-hosted on the current stack** (no new vendor account, stays local/self-hosted, consistent with the SQLite choice).

Changed:

- `server/auth.ts` (new): password hashing/verification (Node's built-in `scrypt`, salted, `timingSafeEqual` comparison — no third-party crypto library), opaque session tokens (random 32 bytes; only their SHA-256 hash is stored, so reading the `sessions` table doesn't hand out usable tokens), a tiny hand-rolled cookie parser (skipped adding `cookie-parser` since Express already has `res.cookie()`/`res.clearCookie()` built in — reading the one cookie we need is five lines);
- `server/db.ts`: added `users` (id, email UNIQUE, password_salt, password_hash, created_at) and `sessions` (token_hash PK, user_id, expires_at) tables; added `slug`/`published` columns to `profiles` (denormalized copies of `data_json`'s nested values, kept in sync on every `PUT`, purely so the public lookup below can be a real indexed query instead of scanning every row — not a uniqueness constraint, see known risks);
- `server/api.ts`: added `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` (email/password validated with `zod`, same library already used for `migrateProfile`); every `/api/profiles*` route now sits behind a `requireAuth` middleware and is scoped to `owner_id` — list only returns the caller's own profiles, get/put/delete on another owner's profile id returns **404, not 403**, so an authenticated-but-wrong user can't even confirm a profile id exists; added `GET /api/public/:slug`, the one deliberately unauthenticated route (see below);
- `src/lib/auth.ts` (new): client for the four auth endpoints, `credentials: 'include'` throughout;
- `src/store/useAuthStore.ts` (new): Zustand store for session status (`checking`/`authenticated`/`anonymous`) + login/register/logout/refresh — a complete no-op in the local-only build (nothing calls `refresh()` unless `VITE_USE_API` is true, so no wasted network calls when there's no server to call);
- `src/routes/Login.tsx` (new): combined sign-in/create-account screen;
- `src/routes/AuthGate.tsx` (new): `AuthGate` wraps `/dashboard` and `/builder/*` — no-op (renders children) in the local-only build, redirects to `/login` (preserving the intended destination) when `VITE_USE_API` is true and the visitor is anonymous; `HomeRoute` makes `/` itself redirect straight to `/login` or `/dashboard` in API mode instead of showing the marketing landing page to someone who's about to hit a login wall anyway;
- `src/App.tsx`: rewired the route tree around the two above; a single top-level `refresh()` call on mount (only when `VITE_USE_API`) so route guards don't each trigger their own `/me` request;
- `src/routes/Dashboard.tsx`: shows the signed-in email + a sign-out control in API mode (unchanged "JG" avatar placeholder in the local-only build);
- `src/lib/httpRepository.ts`: every request now sends `credentials: 'include'`; added `AuthRequiredError` for a clean 401 signal, and `findPublishedBySlug` calling the new public endpoint **without** credentials (a signed-out visitor has none to send);
- `src/lib/repository.ts`: added `findPublishedBySlug` to the `ProfileRepository` interface itself (not just the HTTP implementation) — `DexieProfileRepository`'s version is the same local-list-scan `PublicPortfolio.tsx` used to do inline, now shared through the interface instead of duplicated;
- `src/routes/PublicPortfolio.tsx`: simplified to call `findPublishedBySlug` instead of scanning `list()` — and, deliberately, **collapsed "unpublished" and "not found" into one state**. This is a considered behavior change, not a bug: once profiles are owner-scoped and the public lookup has to work without a session, telling an anonymous visitor "this slug exists but isn't published" vs "no such slug" leaks which slugs are claimed. Updated `e2e/portfolio.spec.ts`'s corresponding test to match;
- `playwright.auth.config.ts` + `e2e/auth.spec.ts` (new): a separate, real (not throwaway) E2E suite for the auth flow — its own `npm run test:e2e:auth` script, starts both the API and Vite (with `VITE_USE_API=true`) itself. Kept out of the default `npm run test:e2e` (`testIgnore` in `playwright.config.ts`) so the default suite stays local-only/no-setup, exactly as before.

Commands/checks:

- `npx tsc -b --force` — clean;
- `npm test` (Vitest): **43/43 passed** — 25 server tests (9 profile CRUD + 9 auth [register validation, duplicate email, wrong password, `/me`, logout, garbage cookie] + 7 new: 4 on the public-lookup endpoint's not-found/unpublished/published/re-unpublished behavior, 2 on cross-owner isolation for overwrite/delete) plus the 18 from Phase 0/1 unchanged;
- **live two-browser-context verification, not just the automated suite**: registered a user, created and published a CV, confirmed the debounced autosave, signed out (redirected to `/login`), confirmed a fresh full-page load of `/dashboard` while signed out also redirects (not just the in-app nav guard), signed back in and confirmed the CV was still there; registered a *second* user in a separate browser context and confirmed their dashboard showed zero profiles while they could still load the first user's *published* portfolio at `/p/:slug` with no session at all;
- `npm run test:e2e:auth`: **4/4 passed** (the checked-in version of the above flow, plus duplicate-registration and wrong-password rejection);
- `npm run test:e2e` (default, local-only): **5/5 passed**, confirming the auth work is a true no-op for the default build — re-verified with a genuinely fresh dev server (not reusing the API-mode one) after removing `.env.local`, since Playwright's `reuseExistingServer` would otherwise silently test against the wrong mode;
- cleaned up afterward: removed the verification `.env.local` and the test rows from `server/data/portfolio.db`.

Known risks / deferred:

- **slugs are not globally unique** — `/api/public/:slug` resolves a collision by serving whichever matching published row was updated most recently; nothing stops two different accounts from both landing on `my-portfolio` (the shared empty/reserved-slug fallback) or a custom slug typed the same way. Real reservation/uniqueness is explicitly Phase 3 scope in the plan, not skipped by oversight;
- **no local→cloud migration path** — a profile created in the local-only (Dexie) build has no way to become an owned server profile; a person switching from local-only to `VITE_USE_API=true` starts with an empty account;
- **no password reset, no email verification, no rate limiting on login/register** — acceptable for local development and for a single/small number of trusted users, not for exposing this publicly. `requireAuth`/owner-scoping is the real security boundary added this pass; those are the next hardening layer, appropriately Phase 4 (hardening/release) work;
- session cookies are `httpOnly`/`sameSite=lax` and `secure` only when `NODE_ENV=production` — correct for local HTTP dev, but confirm `NODE_ENV=production` is actually set wherever this is deployed, or sessions will ride over plain HTTP;
- object storage for images is still not implemented — base64 images now flow through `users`-owned SQL rows too, unchanged risk from the previous entry, arguably more relevant now that real accounts exist.

Next safe step: object storage for images (the last big piece blocking a real "upload your photo" flow from bloating the database), or the local→cloud migration flow, or start Phase 3 (real publish/unpublish, sanitized public snapshots, slug reservation) now that ownership exists to reserve a slug *to*.

### 2026-09-01 — Real SQL-backed CRUD (SQLite via server/, opt-in)

Requested: "add a CRUD so this can hit a real db, maybe a small sql db" — scoped deliberately to persistence only, not auth (auth is separate Phase 2 work, still open above).

Changed:

- `server/db.ts` (new): SQLite via Node's built-in `node:sqlite` (`DatabaseSync`) — no native compile step, no extra dependency risk. One `profiles` table: `id, owner_id, profile_name, schema_version, version, updated_at, data_json`, matching the JSON-document-column shape implementation-plan section 5.3 already recommended (not a fully normalized relational schema). `owner_id` is unused until auth exists — included now so adding auth later isn't a schema migration. DB file at `server/data/portfolio.db` (gitignored), created on first run;
- `server/api.ts` (new): `createApp(db)` — an Express app with `GET /api/profiles`, `GET/PUT/DELETE /api/profiles/:id`. `PUT` is an upsert (create or update) taking `{ profile, expectedVersion? }`, validates the body through the *same* `migrateProfile` the client uses (the server trusts a request body no more than a JSON import), and returns 409 with the current record on a version mismatch — the same optimistic-concurrency contract `ProfileRepository.save` already declared in Phase 0. Exported as a factory (not auto-listening) specifically so tests can run it against an isolated in-memory database;
- `server/index.ts` (new): starts that app on `PORT` (default 8787);
- `src/lib/httpRepository.ts` (new): `HttpProfileRepository implements ProfileRepository` — calls the API above over same-origin `/api/...`, validates every response through `migrateProfile` too, and turns a 409 into the existing `ConcurrencyError`;
- `src/lib/activeRepository.ts` (new): the single composition point — `VITE_USE_API=true` selects `HttpProfileRepository`, otherwise (the default) `DexieProfileRepository`, both behind the same `ProfileRepository` type. All four route files now import `profileRepository` from here instead of `repository.ts` directly;
- `src/lib/repository.ts`: exported the `DexieProfileRepository` class (was an already-instantiated singleton) so `activeRepository.ts` can compose it — kept one-directional (`repository.ts` doesn't import `httpRepository.ts`, avoiding a circular import between the two implementations);
- `vite.config.ts`: added `server.proxy` forwarding `/api` to `http://127.0.0.1:8787` in dev, so the client only ever calls same-origin `/api/...` — no CORS handling needed, no separate URL to configure;
- `tsconfig.server.json` (new) + `tsconfig.json` reference: `server/` is now actually typechecked by `tsc -b`/`npm run build` (scoped to `server/**/*.ts` plus the specific non-JSX `src/lib`/`src/types` files it imports, to avoid pulling in DOM/JSX-only source it has no business checking);
- `package.json`: `npm run server` (API only, `tsx watch`), `npm run dev:all` (Vite + API together, via `concurrently`), `npm run test:server` (Supertest against the API); added `express`, and devDependencies `tsx`, `concurrently`, `supertest`, `@types/express`, `@types/supertest`, `@types/node`;
- `.env.example` (new, documents `VITE_USE_API`); `.gitignore`: `server/data`, `.env`, `.env.local`;
- `README.md`: new "Real database (optional)" section, updated architecture list, `schemaVersion: 2` JSON example.

Found and fixed along the way (unrelated to the feature, but blocked verifying it):

- **`vite.config.js` and `vite.config.d.ts` — stale compiled artifacts, committed in the repository's very first commit, sitting in the repo root since before this session started.** Vite prefers a `.js` sibling over `.ts`, so they were silently shadowing every edit to `vite.config.ts` this whole session (routing's dev server, this proxy) — the proxy config I wrote was correct from the first attempt, but real requests kept coming back as Vite's SPA-fallback HTML rather than reaching the API, which is what surfaced this. Deleted both; `vite.config.ts` (the actual source) now controls dev-server behavior as expected. This means the proxy config in earlier Phase 0/1 dev sessions was also silently inert whenever anyone touched `vite.config.ts` — nothing in this project depended on it before now, so no other regression from it.

Commands/checks:

- `npx tsc -b --force` and `npm run build` — clean, including the new server project reference;
- `npm run test:server` (Supertest against an in-memory `node:sqlite` instance, not the real file): **9/9 passed** — empty list, create via PUT returns version 1, list/get a saved profile, 404 for a missing one, update increments version, a stale `expectedVersion` gets a 409 with the current (correct) version, a body/URL id mismatch is rejected with 400, a structurally invalid profile is rejected with 400, delete then 404;
- `npm test` (full suite): **27/27 passed** (18 from Phase 0 + these 9);
- **Live end-to-end verification, not just tests**: started both `npm run server` and `npm run dev` with `VITE_USE_API=true`, drove the real browser with Playwright — created a CV, renamed it, waited out the autosave debounce, reloaded the page (forcing a real re-fetch since the in-memory store resets on reload), and confirmed the renamed value came back from the server; checked the Dashboard's list also reflected it. Then read `server/data/portfolio.db` directly with a throwaway `node:sqlite` script — the row was there, `version: 2` (create + the rename), matching the API's own response exactly. Zero console errors;
- re-ran the full existing Playwright E2E suite (all 5 tests from the Phase 0 entry) against the **API-backed** dev server — all 5 passed unmodified, confirming real behavioral parity between `DexieProfileRepository` and `HttpProfileRepository` under the same `ProfileRepository` contract;
- re-ran the same 5 E2E tests again with `VITE_USE_API` unset (the default) to confirm the local-only path is unchanged — all 5 passed;
- cleaned up: removed the verification `.env.local` and the test row from `server/data/portfolio.db` afterward, so the default `npm run dev` experience and the shipped SQLite file are both untouched by this verification.

Known risks / deferred:

- **no authentication or authorization** — this is a CRUD/persistence step only, exactly as requested; anyone who can reach the API (today: `localhost:8787`, or wherever it's deployed) can read/write/delete any profile. Do not point `VITE_USE_API` at a publicly reachable server without adding auth first;
- the SQL schema stores the full profile as a `data_json` column, not normalized relational tables — this was a deliberate reuse of the shape implementation-plan section 5.3 already specified, not a shortcut, but it does mean there's no server-side ability to query/filter on nested fields (e.g. "profiles with a published portfolio") without either adding real columns for the fields worth indexing or parsing JSON in SQL;
- `publish()`/`unpublish()` remain unimplemented on both repository implementations, same as Phase 0 — still nothing calls them;
- base64 images are now also flowing through and stored in the SQL database (as part of `data_json`), not just IndexedDB — the Phase 1 known-risk about needing object storage before Phase 3 applies here too, arguably more so since a shared server DB will grow faster than one person's browser;
- offline cache/retry are not implemented for `HttpProfileRepository` — if the API is unreachable, saves fail outright (`saveState: 'error'`) rather than queuing.

Next safe step:

- add authentication in front of this API (this is now the natural point to start Phase 2's auth work — the persistence seam it needs already exists), or, if sticking with local-only for now, move on to the Figma visual approval / remaining Phase 1 polish instead.

### 2026-09-01 — Phase 0: routing, schema v2 migration, repository interfaces, test harnesses

Changed:

- `src/lib/schema.ts` (new): `CURRENT_SCHEMA_VERSION = 2`, a Zod schema validating the trust-boundary shape of `CVData`, and `migrateProfile(raw: unknown): CVData` — additively backfills `portfolio`, skill proficiency, project sector/tags/https-URLs, normalizes item order and the portfolio slug (lowercase-hyphenated, reserved-path/empty fallback to `my-portfolio`), then validates before returning. This is now the *only* place `unknown` JSON becomes a trusted `CVData` — no more `parsed as CVData` casts;
- `src/types/cv.ts`: `CVData.schemaVersion` is now the literal `2` (was `1`) — enforced at the type level, not just data;
- `src/data/sampleCV.ts`: bumped to `schemaVersion: 2`;
- `src/data/portfolioDefaults.ts`: dropped `normalizeCVData` (superseded by `migrateProfile`); kept `createPortfolioDefaults`/`levelToProficiency` as the content `migrateProfile` backfills from;
- `src/lib/repository.ts` (new): `ProfileRepository` interface (`list`/`get`/`save` with optional `expectedVersion`/`remove`/`publish`/`unpublish`), `ConcurrencyError`, and `DexieProfileRepository` — the only implementation, backed by IndexedDB. `publish()`/`unpublish()` deliberately `throw` (not implemented) rather than faking a public snapshot that doesn't exist yet — the "Mark as published" checkbox added in Phase 1 remains a local-only preview flag, unrelated to this interface;
- `src/lib/db.ts`: reduced to just the Dexie table definition; `loadProfiles`/`saveProfile`/`removeProfile` removed now that `profileRepository` is the only caller of Dexie;
- `src/store/useCVStore.ts`: `setCV`/`setProfiles` now run everything through `migrateProfile`; added `syncVersion(version, updatedAt)` — merges just the persistence bookkeeping fields back into the store after a save without clobbering edits made while the save was in flight (the correctness-critical piece of wiring `expectedVersion` optimistic concurrency through a debounced autosave);
- **Routing** — replaced the local `screen` state machine in `App.tsx` with `react-router-dom` (already a dependency, previously unused): `/`, `/dashboard`, `/builder/:profileId/:tab`, `/p/:slug`. `App.tsx` is now just the route table with `Builder` and `PublicPortfolio` lazy-loaded (`React.lazy`/`Suspense`) so their chunks (editor, `CVDocument`, portfolio editor/page) aren't in the initial bundle. `main.tsx` wraps the app in `BrowserRouter`;
- `src/routes/Landing.tsx`, `Dashboard.tsx`, `Builder.tsx`, `PublicPortfolio.tsx`, `shared.tsx` (all new) — the old screens extracted with equivalent behavior, plus real fixes that only routing made possible:
  - `Builder` now hydrates from `profileRepository.get(profileId)` when the store's current profile doesn't match the URL — **a direct link or a page reload on `/builder/:id/cv` now correctly restores that exact profile from IndexedDB**, instead of always bouncing to landing/dashboard;
  - `PublicPortfolio` reads `/p/:slug` and renders the real, non-embedded `PortfolioPage`, with explicit loading/not-found/unpublished states. **Important limitation, called out in-code and here**: this is a local-only read — it scans the current browser's own IndexedDB for a matching published slug. It only renders for the person who built it, in that same browser. A real shareable link needs the Phase 2/3 cloud backend and public-snapshot read path (D-003);
  - the CV/Portfolio tab is now part of the URL (`/builder/:id/cv` vs `/builder/:id/portfolio`) instead of local component state — bookmarkable, and browser back/forward works;
- `src/lib/portfolio.ts` (new): extracted `projectSector`/`deriveSectors`/`filterProjectsBySector` out of `PortfolioPage.tsx` as pure, unit-tested functions;
- **Test harnesses**: added Vitest (`vitest.config.ts`, jsdom, `@testing-library/react`/`jest-dom`) and Playwright (`playwright.config.ts`, `@playwright/test` as a real project dependency — the earlier ad hoc scratchpad install is superseded). `npm test` runs unit+component tests, `npm run test:e2e` runs the E2E suite (both wired into `package.json`).

Fixed during verification (see "Commands/checks"):

- the responsive breakpoint sweep against the real `/p/:slug` route (not just the embedded builder preview) surfaced a real layout gap the embedded-preview check in the Phase 1 pass couldn't have caught: `.portfolio-hero`/`.portfolio-about`/`.portfolio-services`/etc. had no max-width container, so at 1920px the content stretched full-bleed with awkward empty space — exactly what implementation-plan section 3 says to avoid. Added a shared `max-width: 1280px; margin-inline: auto;` rule across the section content rows (backgrounds still span full-bleed, only content is capped). Re-verified at all five widths.

Commands/checks:

- `npx tsc --noEmit -p .` and `npm run build` — clean; build output now shows real route-level chunks (`Builder-*.js` 90.75 kB, `PortfolioPage-*.js` 14.95 kB, `PublicPortfolio-*.js` 1.09 kB, `importCV-*.js` 1.69 kB, all separate from the ~360 kB main chunk) where before this pass everything shipped in one bundle;
- `npm test` (Vitest): **18 tests passed** — 15 pure-function tests (`schema.test.ts`: legacy-v1 migration, proficiency mapping/clamping, sector/https normalization, order normalization, reserved/empty slug fallback, idempotency, rejecting a too-new schema version, rejecting non-object input; `portfolio.test.ts`: sector derivation/filtering) + 3 component tests (`Editor.test.tsx`, React Testing Library);
- `npm run test:e2e` (Playwright, real browser against the dev server): **5 tests passed** — create→My Portfolio→walk all 5 editor panels→toggle viewport with zero console errors; **direct reload of a `/builder/:id/cv` URL re-hydrates from IndexedDB** (the routing fix above, verified end-to-end); an unpublished slug shows the "isn't published" state; publishing then visiting `/p/:slug` in the same browser renders the real page; a nonexistent slug shows "not found";
- responsive sweep at 360/768/1024/1440/1920 against the actual `/p/:slug` route (screenshots reviewed, not just generated) — nav collapses to a hamburger correctly below 900px (this now uses the real viewport, not the container-query workaround Phase 1 needed for the embedded preview — both paths share the same CSS and both were re-verified), hero/about/services/projects/testimonials/contact/footer all read correctly at every width, no horizontal scroll, no clipped content.

Known risks / deferred:

- **the public route only works in the builder's own browser** — see the `PublicPortfolio` limitation above. This is the main thing Phase 2/3 (cloud backend, real public snapshot storage) actually needs to fix, not routing;
- `publish()`/`unpublish()` on `ProfileRepository` are unimplemented by design (throw with a clear message) — Phase 2/3 must implement them against a real backend; nothing currently calls them;
- optimistic concurrency (`expectedVersion`) is wired correctly but untested under real concurrent writers, since there's only one writer possible in a local single-browser app today — worth a deliberate multi-tab test once Phase 2 makes concurrent writes real;
- component-test coverage is intentionally minimal (2 primitives) — enough to prove the harness works end-to-end, not a coverage claim; expand as Phase 2/3 add components with real logic worth testing in isolation;
- still no human visual approval against the actual Figma frame (`1:1568`) — this session has no Figma tool access, so the breakpoint sweep validates the implementation's own responsive behavior, not a pixel-diff against the source design.

Next safe step:

- Phase 2: pick an auth/backend approach (the plan suggests Supabase — Auth, Postgres, Storage, RLS, Edge Functions — but keep the `ProfileRepository` contract vendor-neutral), implement a cloud-backed `ProfileRepository`, add owner-scoped authorization, object storage for the base64 images currently embedded in `CVData` (flagged as a known risk in the Phase 1 entry below), and a local-profile migration/claim flow so profiles created in this local-only build aren't orphaned.

### 2026-09-01 — Phase 1: local portfolio builder and public page implemented

Changed:

- `src/types/cv.ts`: added `PortfolioSectionKey`/`PortfolioEditorSection`, `PortfolioService`, `Testimonial`, `PortfolioSettings`, `LinkPreview` types; extended `Skill` with `proficiency`/`featured` and `Project` with `url`/`sector`/`tags`/`image`/`linkPreview`/`featured`; added `portfolio: PortfolioSettings` to `CVData` (schema stays `schemaVersion: 1`, additive only — see decision D-008 below);
- `src/data/portfolioDefaults.ts` (new): `createPortfolioDefaults()`, `levelToProficiency` map, and `normalizeCVData()` which backfills `portfolio`, skill proficiency, and project sector/tags on any loaded profile;
- `src/data/sampleCV.ts`: wired `portfolio: createPortfolioDefaults()` into the seed profile;
- `src/store/useCVStore.ts`: `setCV`/`setProfiles` now run `normalizeCVData`; added `portfolioSection` state + `setPortfolioSection`;
- `src/components/portfolio/PortfolioPage.tsx` (already scaffolded by the prior pass) wired up unchanged;
- `src/components/portfolio/PortfolioEditor.tsx` (new): Overview & publishing, Hero & about images, Services, Testimonials, Contact & footer panels, reusing `Field`/`TextArea`/`Checkbox`/`SortableList`/`CardActions`/`AddButton`/`ImageUpload`/`Panel` exported from `Editor.tsx`;
- `src/components/editor/Editor.tsx`: exported the shared form primitives above; added `ImageUpload` (drag/drop + click + keyboard, JPEG/PNG/WebP, size-limited, alt text); extended `SkillEditor` with a proficiency slider + "Featured on portfolio" checkbox; extended `ProjectEditor` with sector, URL, tags, image upload, and featured fields;
- `src/lib/image.ts` (new): `readImageFile()` — validates type/size and reads a local image to a data URL for local preview/storage (documented as a Phase-2-replaceable stopgap; see Known risks);
- `src/App.tsx`: added a `builderTab` ('cv'/'portfolio') screen-state switch with a desktop/mobile tab bar, a portfolio sidebar nav, a viewport switch (Desktop/Tablet/Mobile) for the embedded public-page preview, and a `downloadPDF()` helper that switches back to the CV tab before invoking `window.print()` so PDF export keeps working from the portfolio tab;
- `src/styles.css`: `.builder-tabs`, portfolio editor pieces (`.image-upload*`, `.slug-field`, `.icon-select`, `.field-hint`, `.sidebar-note`, `.viewport-switch`, `.portfolio-frame`), and the full public-page stylesheet (`.portfolio-*`) — nav, hero, about/skills progress bars, services, project filters/grid, testimonial carousel, contact, footer, reveal-on-view motion with `prefers-reduced-motion` handling; theme is driven entirely by CSS custom properties set from `cv.settings` (no hard-coded Figma orange).

Fixed during verification:

- the in-builder responsive preview used `@media (max-width: 900px)` for the nav-to-hamburger breakpoint, which only reacts to actual browser viewport width — so shrinking the embedded preview frame to a "Mobile" width did not collapse the nav. Switched `.portfolio-site` to `container-type: inline-size` and the breakpoint to `@container portfolio (max-width: 900px)`, which is correct both for the shrunk embedded frame today and for the real full-width `/p/:slug` route in a later phase.

Commands/checks:

- `npx tsc --noEmit -p .` — clean, no errors;
- `npm run build` (`tsc -b && vite build`) — succeeds; pre-existing pdf.js chunk-size warning only, unrelated to this change;
- launched `npm run dev`, drove it with a local Playwright script (`playwright` installed ad hoc into the scratchpad — not added as a project dependency): created a CV, switched to My Portfolio, walked all five editor panels, toggled Desktop/Tablet/Mobile preview, scrolled through hero/about/skills/services/projects/testimonials/contact/footer; `console --errors` equivalent (`page.on('console'/'pageerror')`) reported zero errors across the whole flow;
- reviewed screenshots of every panel and every public section at both 1440px (desktop) and the embedded 390px (mobile) frame — layout, icons, progress bars, filters, carousel, and contact form all rendered correctly and matched the shared CV theme color.

Known risks / deferred:

- **Phase 0 (real routing, `schemaVersion: 2` + migration, repository interfaces, test harness) was deliberately skipped for this pass** — see decision D-008;
- images are stored as base64 data URLs directly on `CVData.portfolio.heroImage`/`aboutImage`/project `image`/testimonial `avatar`, saved into the existing IndexedDB profile document. This works locally but is exactly what section 6.2 of the implementation plan says not to do for production — Phase 2 must replace it with object storage + asset references before publishing real user data;
- "Mark as published" in the Overview panel is a local flag only (no backend), labelled as preview-only in the UI copy so it can't be mistaken for a live publish;
- only self-reviewed at 1440px and the 390px embedded frame; the plan's full 360/768/1024/1920 sweep and an explicit visual approval against the Figma frame are still outstanding;
- loading/error states for the public page are not implemented because there is no network fetch yet on this local-only pass (correctly deferred to Phase 2/3, not a gap in this pass's own scope).

Next safe step:

- get explicit visual sign-off on the public page at the full breakpoint set against Figma frame `1:1568`, then decide whether to start Phase 0 (routing + schema v2 + test harness) before or in parallel with Phase 2 (auth/cloud storage), since Phase 2 depends on Phase 0's repository interfaces.

### 2026-09-01 — Repository and design audit

Changed:

- added implementation plan, universal build prompt, and progress ledger only;
- no application source, dependency, database, or deployment changes.

Observed:

- current app is a local-first SPA with UI screen state in `App.tsx`;
- CV data is a single version-1 JSON object autosaved to IndexedDB;
- cloud identity, storage, public data boundary, and hosting must be introduced;
- supplied Figma frame contains nav, hero, about/skills, services, projects, testimonials, contact, and footer;
- portfolio theme must use shared CV semantic tokens instead of fixed Figma orange.

Commands/checks:

- repository tree and git status inspected;
- relevant source, types, store, persistence, package, and style files inspected;
- Figma full-frame screenshot, metadata, and variable definitions inspected;
- application build not run during the documentation-only audit.

Next safe step:

- begin Phase 0 by installing existing dependencies if needed, recording baseline typecheck/build, and extracting routes without changing current behavior.

## Decision log

| ID | Decision | Rationale | Status |
| --- | --- | --- | --- |
| D-001 | Public route is `/p/:slug` | Stable, shareable, avoids builder-route collision | Accepted |
| D-002 | First publish is explicit; later successful saves auto-refresh live snapshot | Prevents accidental exposure while meeting live-sync requirement | Accepted |
| D-003 | Public pages read allowlisted publication snapshots | Strong privacy boundary and stable last-known-good release | Accepted |
| D-004 | Theme uses shared semantic variables | Keeps CV and portfolio controls synchronized | Accepted |
| D-005 | IndexedDB becomes cache, not live source | Current browser-only data cannot serve a public/authenticated product | Accepted |
| D-006 | Backend implementation stays behind repository/API contracts | Avoids locking UI/domain code to one provider | Accepted |
| D-007 | Public testimonial submission is deferred | Requires consent, abuse prevention, and moderation not requested for v1 | Accepted |
| D-008 | Phase 1 built the portfolio UI directly on the existing local `App.tsx` screen-state model and `schemaVersion: 1` (additive fields only), instead of doing Phase 0's routing/schema-v2/repository-interface work first | Phase 0 is a significant architectural rework (real router, versioned migration, repository interfaces, test harness) that the prior pass had already started building past (types + defaults were added additively); doing Phase 1's UI on top of the current shell first gets a reviewable, working increment sooner | Resolved — Phase 0 completed same day, see its work log entry |

## Open product/deployment decisions

These do not block Phase 0 or most of Phase 1:

- final production host/domain and whether the canonical URL uses a custom domain;
- authentication providers (email magic link, Google, or both);
- cloud vendor selection and project credentials;
- whether contact CTA is `mailto:` or a protected contact form;
- whether project clicks always open the external URL or can open internal detail pages;
- retention/recovery period for deleted media and unpublished snapshots.

## Agent handoff template

```text
Date/agent:
Phase/task:
Files changed:
Schema/migrations:
Commands run and exact result:
Manual checks:
Security/access checks:
Deployment/version/URL:
Known risks or blockers:
Next safe step:
```

