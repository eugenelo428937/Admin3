import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { DarkModeProvider } from './DarkModeProvider';
import { AdminShell } from './AdminShell';
import '@/components/admin/styles/admin.css';

export default function AdminLayout() {
  const { isSuperuser, isLoading } = useAuth() as any;

  if (isLoading) {
    return (
      <div className="admin-root tw:flex tw:h-screen tw:items-center tw:justify-center tw:bg-[var(--background)]">
        <div className="tw:text-[var(--muted-foreground)]">Loading...</div>
      </div>
    );
  }

  if (!isSuperuser) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="admin-root tw:font-sans">
      <DarkModeProvider>
        <AdminShell />
      </DarkModeProvider>
    </div>
  );
}
