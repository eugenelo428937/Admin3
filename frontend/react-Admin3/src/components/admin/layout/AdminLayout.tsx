import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { AdminSidebar } from './AdminSidebar';
import '@/components/admin/styles/admin.css';

export default function AdminLayout() {
  const { isSuperuser, isLoading } = useAuth() as any;

  if (isLoading) {
    return (
      <div className="admin-root tw:flex tw:h-screen tw:items-center tw:justify-center tw:bg-admin-bg">
        <div className="tw:text-admin-fg-muted">Loading...</div>
      </div>
    );
  }

  if (!isSuperuser) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="admin-root tw:flex tw:min-h-screen tw:bg-admin-bg tw:font-sans">
      <AdminSidebar />
      <main className="tw:flex-1 tw:overflow-auto tw:ml-[var(--admin-sidebar-width)]">
        <Outlet />
      </main>
    </div>
  );
}
