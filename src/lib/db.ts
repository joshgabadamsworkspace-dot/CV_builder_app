import Dexie, { type EntityTable } from 'dexie';
import type { CVData } from '../types/cv';

const db = new Dexie('ClassicBlueCV') as Dexie & { profiles: EntityTable<CVData, 'id'> };
db.version(1).stores({ profiles: 'id, profileName, updatedAt' });
export { db };

export async function loadProfiles() { return db.profiles.orderBy('updatedAt').reverse().toArray(); }
export async function saveProfile(profile: CVData) { await db.profiles.put(profile); }
export async function removeProfile(id: string) { await db.profiles.delete(id); }
