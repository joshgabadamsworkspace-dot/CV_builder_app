export interface AuthUser { id: string; email: string }

async function parseErrorBody(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null) as { error?: string } | null;
  return body?.error ?? fallback;
}

/** Client for the self-hosted email/password auth in server/ — cookie-based
 *  sessions (`credentials: 'include'`), same-origin `/api/auth/*` via the
 *  Vite dev proxy. Only meaningful when VITE_USE_API=true; the local-only
 *  (Dexie) build has no concept of an account. */
export const authClient = {
  async register(email: string, password: string): Promise<AuthUser> {
    const res = await fetch('/api/auth/register', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(await parseErrorBody(res, 'Could not create account.'));
    return res.json();
  },

  async login(email: string, password: string): Promise<AuthUser> {
    const res = await fetch('/api/auth/login', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(await parseErrorBody(res, 'Could not sign in.'));
    return res.json();
  },

  async logout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  },

  async me(): Promise<AuthUser | null> {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (res.status === 401) return null;
    if (!res.ok) throw new Error('Could not check sign-in status.');
    return res.json();
  },
};
