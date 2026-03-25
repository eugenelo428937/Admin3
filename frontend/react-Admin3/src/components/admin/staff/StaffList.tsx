import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  AdminPage,
  AdminPageHeader,
  AdminDataTable,
  AdminErrorAlert,
} from '@/components/admin/composed';
import { useAuth } from '../../../hooks/useAuth.tsx';
import useStaffListVM from './useStaffListVM';

const AdminStaffList: React.FC = () => {
  const { isSuperuser } = useAuth();
  const vm = useStaffListVM();
  const navigate = useNavigate();

  if (!isSuperuser) return <Navigate to="/" replace />;

  return (
    <AdminPage>
      <AdminPageHeader
        title="Staff"
        actions={[
          { label: 'Add New Staff', icon: Plus, onClick: () => navigate('/admin/staff/new') },
        ]}
      />
      <AdminErrorAlert message={vm.error} />
      <AdminDataTable
        columns={[
          { key: 'id', header: 'ID' },
          {
            key: 'user',
            header: 'Email',
            render: (_val, row) => <span>{row.user_detail?.email}</span>,
          },
          {
            key: 'is_active',
            header: 'First Name',
            render: (_val, row) => <span>{row.user_detail?.first_name}</span>,
          },
          {
            key: 'user_detail',
            header: 'Last Name',
            render: (_val, row) => <span>{row.user_detail?.last_name}</span>,
          },
        ]}
        data={vm.staff}
        loading={vm.loading}
        emptyMessage="No staff members found."
        pagination={{
          page: vm.page,
          pageSize: vm.rowsPerPage,
          total: vm.totalCount,
          onPageChange: vm.handleChangePage,
          onPageSizeChange: vm.handleChangeRowsPerPage,
          pageSizeOptions: [25, 50, 100],
        }}
        actions={(row) => [
          { label: 'Edit', icon: Pencil, onClick: () => navigate(`/admin/staff/${row.id}/edit`) },
          { label: 'Delete', icon: Trash2, variant: 'destructive' as const, onClick: () => vm.handleDelete(row.id) },
        ]}
      />
    </AdminPage>
  );
};

export default AdminStaffList;
