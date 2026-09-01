import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // auth.spec.ts needs VITE_USE_API=true and the API server — it has its own
  // config (playwright.auth.config.ts, run via `npm run test:e2e:auth`) so
  // this default (local-only, no server) suite stays fast and setup-free.
  testIgnore: 'auth.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
