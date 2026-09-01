import { create } from 'zustand';
import { authClient, type AuthUser } from '../lib/auth';

type AuthStatus = 'checking' | 'authenticated' | 'anonymous';
interface AuthStore {
  user: AuthUser | null;
  status: AuthStatus;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Only meaningful when VITE_USE_API=true — see src/lib/activeRepository.ts.
// The local-only (Dexie) build never calls any of this, so `status` just
// stays at its initial value and nothing fetches.
export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  status: 'checking',
  refresh: async () => {
    try { const user = await authClient.me(); set({ user, status: user ? 'authenticated' : 'anonymous' }); }
    catch { set({ user: null, status: 'anonymous' }); }
  },
  login: async (email, password) => { const user = await authClient.login(email, password); set({ user, status: 'authenticated' }); },
  register: async (email, password) => { const user = await authClient.register(email, password); set({ user, status: 'authenticated' }); },
  logout: async () => { await authClient.logout(); set({ user: null, status: 'anonymous' }); },
}));
