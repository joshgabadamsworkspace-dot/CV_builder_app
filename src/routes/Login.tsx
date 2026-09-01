import { useState, type FormEvent } from 'react';
import { LogIn, UserPlus } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Logo } from './shared';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuthStore();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  // Pre-filled for this personal, localhost-only install so signing in is a
  // single click — this is only reachable behind VITE_USE_API in the first
  // place. Remove this if the app is ever meant for more than one person or
  // reachable beyond your own machine.
  const [email, setEmail] = useState('joshgabadams@gmail.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      if (mode === 'signin') await login(email, password); else await register(email, password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== '/login' ? from : '/dashboard', { replace: true });
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong.'); }
    finally { setBusy(false); }
  };

  return <main className="auth-screen">
    <div className="auth-card">
      <div className="brand"><Logo /> Classic Blue</div>
      <h1>{mode === 'signin' ? 'Sign in' : 'Create your account'}</h1>
      <p>{mode === 'signin' ? 'Your CVs and portfolio, synced to the server.' : 'Takes a few seconds — no email verification required.'}</p>
      <form onSubmit={submit}>
        <label className="field wide"><span>Email</span><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
        <label className="field wide"><span>Password</span><input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} /></label>
        {error && <p className="auth-error">{error}</p>}
        <button className="primary large" type="submit" disabled={busy}>{mode === 'signin' ? <><LogIn />Sign in</> : <><UserPlus />Create account</>}</button>
      </form>
      <button className="auth-switch" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}>
        {mode === 'signin' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
      </button>
    </div>
  </main>;
}
