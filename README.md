# Classic Blue CV Builder

A local-first, layout-locked CV builder based on Joshua Gabriel's supplied CV. Career information is edited as structured data and rendered through one polished A4 template—there is no free-form canvas and no manual page redesign.

## Run locally

```bash
npm install
npm run dev
```

Create a production bundle with `npm run build`, then inspect it with `npm run preview`.

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
- `src/store/useCVStore.ts` owns the selected CV and editor state.
- `src/lib/db.ts` persists complete profiles in IndexedDB.
- `src/data/sampleCV.ts` contains removable seed data based on the reference CV.
- `src/components/editor/Editor.tsx` contains structured section editors.
- `src/components/preview/CVDocument.tsx` converts data into semantic blocks, keeps entries together, paginates them, and renders the Classic Blue template.
- `src/lib/importCV.ts` extracts PDF/DOCX text locally and produces a reviewable draft.

The renderer never reads form state. It only receives a valid `CVData` object.

## CV JSON format

Backups contain a complete `CVData` object with `schemaVersion: 1`. The top-level shape is:

```json
{
  "schemaVersion": 1,
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
  "settings": {}
}
```

Future schema changes should be handled by a migration function before a profile enters the store. Keep migrations additive and preserve hidden-section content.

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

The application is static after `npm run build`. Deploy `dist/` to Vercel, Netlify, Cloudflare Pages, GitHub Pages, or any static host. Configure the host to serve `index.html` as the SPA fallback. No server or environment variables are required for the local-first version.

Personal data remains in the current browser's IndexedDB unless the user explicitly downloads a JSON backup or uploads a document.
