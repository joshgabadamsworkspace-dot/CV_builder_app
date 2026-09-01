import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthGate, HomeRoute, USE_API } from './routes/AuthGate';
import { Login } from './routes/Login';
import { useAuthStore } from './store/useAuthStore';

// Route-level code splitting: Landing/Login are the first paint and stay
// small; Builder (editor + CVDocument + portfolio editor) and PublicPortfolio
// pull in the heavier chunks, so they're loaded on demand only.
const Dashboard = lazy(() => import('./routes/Dashboard').then((m) => ({ default: m.Dashboard })));
const Builder = lazy(() => import('./routes/Builder').then((m) => ({ default: m.Builder })));
const PublicPortfolio = lazy(() => import('./routes/PublicPortfolio').then((m) => ({ default: m.PublicPortfolio })));

export default function App() {
  const refresh = useAuthStore((s) => s.refresh);
  // Resolve the session once up front (no-op in the default local-only
  // build) so route guards below don't each trigger their own /me call.
  useEffect(() => { if (USE_API) refresh(); }, [refresh]);

  return <Suspense fallback={<main className="route-loading"><p>Loading…</p></main>}>
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/login" element={<Login />} />
      <Route element={<AuthGate />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/builder/:profileId/:tab" element={<Builder />} />
        <Route path="/builder/:profileId" element={<Navigate to="cv" replace />} />
      </Route>
      <Route path="/p/:slug" element={<PublicPortfolio />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>;
}
