import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/admin/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { AdminTopBar } from './AdminTopBar';

export function AdminShell() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AdminTopBar />
        <main className="tw:flex-1 tw:overflow-auto tw:p-4">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
