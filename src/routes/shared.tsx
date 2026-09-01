import { FileText, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sampleCV } from '../data/sampleCV';
import { migrateProfile } from '../lib/schema';
import { profileRepository } from '../lib/activeRepository';
import { useCVStore } from '../store/useCVStore';
import type { CVData } from '../types/cv';
import type { ImportResult } from '../lib/importCV';

export function Logo() { return <span className="logo"><FileText /></span>; }

export function count(cv: CVData, key: string) { const value = cv[key as keyof CVData]; return Array.isArray(value) ? value.length : ''; }
export function download(blob: Blob, name: string) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
export function relative(date: string) { const hours = Math.floor((Date.now() - new Date(date).getTime()) / 36e5); if (hours < 1) return 'just now'; if (hours < 24) return `${hours}h ago`; const days = Math.floor(hours / 24); return days === 1 ? 'yesterday' : `${days} days ago`; }

function createFreshProfile(): CVData {
  return migrateProfile({ ...structuredClone(sampleCV), id: crypto.randomUUID(), profileName: 'Untitled CV', updatedAt: new Date().toISOString() });
}

/** Centralizes the profile-lifecycle actions Landing and Dashboard both need,
 *  going through `profileRepository` (never Dexie/db directly) so persistence
 *  can be swapped for a cloud backend later without touching either screen. */
export function useProfileActions() {
  const navigate = useNavigate();
  const { cv, setCV, setProfiles, setSaveState } = useCVStore();
  const refreshProfiles = async () => setProfiles(await profileRepository.list());
  const openExisting = (profile: CVData) => { setCV(profile); navigate(`/builder/${profile.id}/cv`); };
  const createAndOpen = async (draft: CVData) => {
    const saved = await profileRepository.save(draft);
    setCV(saved); setSaveState('saved');
    await refreshProfiles();
    navigate(`/builder/${saved.id}/cv`);
  };
  const create = () => createAndOpen(createFreshProfile());
  const duplicate = (profile: CVData) => createAndOpen(migrateProfile({ ...structuredClone(profile), id: crypto.randomUUID(), profileName: `${profile.profileName} — Copy`, updatedAt: new Date().toISOString() }));
  const remove = async (id: string) => { await profileRepository.remove(id); await refreshProfiles(); };
  const importDocument = async (file: File) => { const { importCV } = await import('../lib/importCV'); return importCV(file, cv); };
  return { create, duplicate, remove, openExisting, createAndOpen, importDocument, refreshProfiles };
}

export function ImportReview({ result, onCancel, onAccept }: { result: ImportResult; onCancel: () => void; onAccept: () => void }) {
  return <div className="modal-backdrop"><section className="import-modal">
    <button className="modal-close" onClick={onCancel}><X /></button>
    <span className="eyebrow">IMPORT REVIEW</span>
    <h2>We found the following information</h2>
    <p>Nothing will replace your profile until you accept it.</p>
    <div className="detected">
      <label>Name<input value={result.draft.personal.fullName} onChange={(e) => { result.draft.personal.fullName = e.target.value; }} /></label>
      <label>Email<input value={result.draft.personal.email} onChange={(e) => { result.draft.personal.email = e.target.value; }} /></label>
      <label>Phone<input value={result.draft.personal.phone} onChange={(e) => { result.draft.personal.phone = e.target.value; }} /></label>
    </div>
    <div className="warnings">{result.warnings.map((w) => <p key={w}>Review needed · {w}</p>)}</div>
    <details><summary>Extracted text</summary><pre>{result.text.slice(0, 5000)}</pre></details>
    <div className="modal-actions"><button onClick={onCancel}>Cancel</button><button className="primary" onClick={onAccept}>Accept and edit</button></div>
  </section></div>;
}
