import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Forwards API calls to the local Express/SQLite server (see server/) so
  // the client can always call same-origin `/api/...` — no CORS needed in
  // dev, and no separate URL to configure. Only used when the app is built
  // with VITE_USE_API=true (see src/lib/activeRepository.ts).
  server: { proxy: { '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true } } },
});
