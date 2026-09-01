import { defineConfig } from '@playwright/test';

// Separate from playwright.config.ts because this exercises VITE_USE_API=true
// — the default `npm run test:e2e` stays local-only (Dexie, no server) so it
// keeps working with zero setup. Run this one with `npm run test:e2e:auth`.
export default defineConfig({
  testDir: './e2e',
  testMatch: 'auth.spec.ts',
  fullyParallel: false, // shares one SQLite file across the run
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: [
    { command: 'npm run server', url: 'http://localhost:8787/api/auth/me', reuseExistingServer: !process.env.CI, timeout: 30_000 },
    { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: !process.env.CI, timeout: 30_000, env: { VITE_USE_API: 'true' } },
  ],
});
