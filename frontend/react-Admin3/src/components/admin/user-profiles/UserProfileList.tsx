import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import {
  AdminPage,
  AdminPageHeader,
  AdminDataTable,
  AdminErrorAlert,
} from '@/components/admin/composed';
import { useAuth } from '../../../hooks/useAuth.tsx';
import useUserProfileListVM from './useUserProfileListVM';

const AdminUserProfileList: React.FC = () => {
  const { isSuperuser } = useAuth();
  const vm = useUserProfileListVM();
  const navigate = useNavigate();

  if (!isSuperuser) return <Navigate to="/" replace />;

  return (
    <AdminPage>
      <AdminPageHeader title="User Profiles" />
      <AdminErrorAlert message={vm.error} />
      <AdminDataTable
        columns={[
          { key: 'id', header: 'ID' },
          {
            key: 'user',
            id: 'email',
            header: 'Email',
            render: (_val, row) => row.user?.email,
          },
          {
            key: 'user',
            id: 'first_name',
            header: 'First Name',
            render: (_val, row) => row.user?.first_name,
          },
          {
            key: 'user',
            id: 'last_name',
            header: 'Last Name',
            render: (_val, row) => row.user?.last_name,
          },
          { key: 'title', header: 'Title' },
        ]}
        data={vm.profiles}
        loading={vm.loading}
        emptyMessage="No user profiles found"
        pagination={{
          page: vm.page,
          pageSize: vm.rowsPerPage,
          total: vm.totalCount,
          onPageChange: vm.handleChangePage,
          onPageSizeChange: vm.handleChangeRowsPerPage,
          pageSizeOptions: [25, 50, 100],
        }}
        actions={(row) => [
          {
            label: 'Edit',
            icon: Pencil,
            onClick: () => navigate(`/admin/user-profiles/${row.id}/edit`),
          },
        ]}
      />
    </AdminPage>
  );
};

export default AdminUserProfileList;
