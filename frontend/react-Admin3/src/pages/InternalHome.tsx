import { Navigate, useSearchParams } from 'react-router-dom';
import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../hooks/useAuth';
import Home from './Home.tsx';
import AdminLogin from './AdminLogin.tsx';

export default function InternalHome() {
  const { isInternal, configLoaded } = useConfig();
  const { isAuthenticated, isSuperuser, isLoading } = useAuth() as any;
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === '1';

  console.log('[InternalHome]', {
    configLoaded,
    isInternal,
    isAuthenticated,
    isSuperuser,
    isLoading,
    isPreview,
    rawSearch: window.location.search,
  });

  if (!configLoaded || isLoading) return null;

  // Public mode: show storefront home
  if (!isInternal) return <Home />;

  // Internal mode, not authenticated: show login
  if (!isAuthenticated || !isSuperuser) return <AdminLogin />;

  // Internal mode, authenticated superuser, preview requested: show storefront
  if (isPreview) return <Home />;

  // Internal mode, authenticated superuser: redirect to admin dashboard
  return <Navigate to="/admin/dashboard" replace />;
}
