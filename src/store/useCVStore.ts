import { create } from 'zustand';
import type { CVData, PortfolioEditorSection, SectionKey } from '../types/cv';
import { sampleCV } from '../data/sampleCV';
import { migrateProfile } from '../lib/schema';

type SaveState = 'saved' | 'saving' | 'error';
interface CVStore {
  cv: CVData; profiles: CVData[]; activeSection: SectionKey | 'personal' | 'theme' | 'sections'; portfolioSection: PortfolioEditorSection; saveState: SaveState;
  setCV: (cv: unknown) => void; setProfiles: (profiles: CVData[]) => void; setActiveSection: (section: CVStore['activeSection']) => void;
  setPortfolioSection: (section: PortfolioEditorSection) => void;
  update: (fn: (draft: CVData) => void) => void; setSaveState: (state: SaveState) => void;
  /** Merges just the persistence bookkeeping fields back after a save, without
   *  clobbering edits made while the save was in flight. */
  syncVersion: (version: number, updatedAt: string) => void;
}
const clone = <T,>(value: T): T => structuredClone(value);
export const useCVStore = create<CVStore>((set) => ({
  cv: migrateProfile(sampleCV), profiles: [], activeSection: 'personal', portfolioSection: 'overview', saveState: 'saved',
  setCV: (cv) => set({ cv: migrateProfile(cv) }), setProfiles: (profiles) => set({ profiles: profiles.map(migrateProfile) }), setActiveSection: (activeSection) => set({ activeSection }),
  setPortfolioSection: (portfolioSection) => set({ portfolioSection }),
  update: (fn) => set((state) => { const next = clone(state.cv); fn(next); next.updatedAt = new Date().toISOString(); return { cv: next, saveState: 'saving' }; }),
  setSaveState: (saveState) => set({ saveState }),
  syncVersion: (version, updatedAt) => set((state) => ({ cv: { ...state.cv, version, updatedAt } })),
}));
