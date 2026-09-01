import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Landing } from './Landing';
import { useAuthStore } from '../store/useAuthStore';

export const USE_API = import.meta.env.VITE_USE_API === 'true';

/** Guards the routes that need an owner (dashboard, builder). No-op in the
 *  default local-only build — there's no account concept without a server. */
export function AuthGate() {
  const { status } = useAuthStore();
  const location = useLocation();

  if (!USE_API) return <Outlet />;
  if (status === 'checking') return <main className="route-loading"><p>Checking your session…</p></main>;
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** `/` itself: the local-only build's first-run landing page in the default
 *  build; in API mode there's no point browsing it anonymously, so route
 *  straight to sign-in or the dashboard. */
export function HomeRoute() {
  const { status } = useAuthStore();
  if (!USE_API) return <Landing />;
  if (status === 'checking') return <main className="route-loading"><p>Loading…</p></main>;
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />;
  return <Navigate to="/login" replace />;
}
