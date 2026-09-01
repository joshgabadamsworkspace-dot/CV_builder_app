import Dexie, { type EntityTable } from 'dexie';
import type { CVData } from '../types/cv';

// Low-level Dexie adapter. UI code should go through `ProfileRepository`
// (`src/lib/repository.ts`), not this module, so persistence can be swapped
// for a cloud backend in Phase 2 without touching the UI.
const db = new Dexie('ClassicBlueCV') as Dexie & { profiles: EntityTable<CVData, 'id'> };
db.version(1).stores({ profiles: 'id, profileName, updatedAt' });
export { db };
