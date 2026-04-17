import { Navigate } from 'react-router-dom';
import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../hooks/useAuth';
import { initStorefrontPreview, isStorefrontPreview } from '../utils/storefrontPreview';
import Home from './Home.tsx';
import AdminLogin from './AdminLogin.tsx';

// Activate preview mode from URL once at module load so it persists across navigation.
initStorefrontPreview();

export default function InternalHome() {
  const { isInternal, configLoaded } = useConfig();
  const { isAuthenticated, isSuperuser, isLoading } = useAuth() as any;

  if (!configLoaded || isLoading) return null;

  // Public mode: show storefront home
  if (!isInternal) return <Home />;

  // Internal mode, not authenticated: show login
  if (!isAuthenticated || !isSuperuser) return <AdminLogin />;

  // Internal mode, authenticated superuser, preview requested: show storefront
  if (isStorefrontPreview()) return <Home />;

  // Internal mode, authenticated superuser: redirect to admin dashboard
  return <Navigate to="/admin/dashboard" replace />;
}
