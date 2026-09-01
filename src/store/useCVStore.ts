import { create } from 'zustand';
import type { CVData, SectionKey } from '../types/cv';
import { sampleCV } from '../data/sampleCV';

type SaveState = 'saved' | 'saving' | 'error';
interface CVStore {
  cv: CVData; profiles: CVData[]; activeSection: SectionKey | 'personal' | 'theme' | 'sections'; saveState: SaveState;
  setCV: (cv: CVData) => void; setProfiles: (profiles: CVData[]) => void; setActiveSection: (section: CVStore['activeSection']) => void;
  update: (fn: (draft: CVData) => void) => void; setSaveState: (state: SaveState) => void;
}
const clone = <T,>(value: T): T => structuredClone(value);
export const useCVStore = create<CVStore>((set) => ({
  cv: clone(sampleCV), profiles: [], activeSection: 'personal', saveState: 'saved',
  setCV: (cv) => set({ cv: clone(cv) }), setProfiles: (profiles) => set({ profiles }), setActiveSection: (activeSection) => set({ activeSection }),
  update: (fn) => set((state) => { const next = clone(state.cv); fn(next); next.updatedAt = new Date().toISOString(); return { cv: next, saveState: 'saving' }; }),
  setSaveState: (saveState) => set({ saveState }),
}));
