import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), 'data');
mkdirSync(dataDir, { recursive: true });

// A real (if small) SQL database — SQLite via Node's built-in `node:sqlite`,
// no native compile step. One row per profile, the validated CVData stored as
// a JSON document column plus the columns the API needs to query/sort/lock
// on without parsing that JSON — the shape docs/portfolio/IMPLEMENTATION_PLAN.md
// section 5.3 recommends (`data_json` + bookkeeping columns, not a fully
// normalized relational schema). `owner_id` is unused until Phase 2 adds auth;
// it's here now so adding auth later doesn't need a migration.
export const db = new DatabaseSync(join(dataDir, 'portfolio.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    owner_id TEXT,
    profile_name TEXT NOT NULL,
    schema_version INTEGER NOT NULL,
    version INTEGER NOT NULL,
    updated_at TEXT NOT NULL,
    data_json TEXT NOT NULL,
    slug TEXT,
    published INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles (updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_profiles_owner ON profiles (owner_id);
  CREATE INDEX IF NOT EXISTS idx_profiles_slug_published ON profiles (slug, published);

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    expires_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
`);
