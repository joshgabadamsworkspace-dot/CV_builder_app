import { DexieProfileRepository, type ProfileRepository } from './repository';
import { HttpProfileRepository } from './httpRepository';

// Opt-in: set VITE_USE_API=true in .env.local, and run the API server
// (`npm run server`, or `npm run dev:all` to run it alongside Vite) so
// persistence hits the real SQL (SQLite) backend in server/ instead of this
// browser's IndexedDB. Unset (the default) keeps the original local-only
// behavior with no server required — see README.md.
export const profileRepository: ProfileRepository =
  import.meta.env.VITE_USE_API === 'true' ? new HttpProfileRepository() : new DexieProfileRepository();
