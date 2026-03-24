import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Upload, Plus, Pencil, Trash2, Eye } from 'lucide-react';
import {
  AdminPage,
  AdminPageHeader,
  AdminDataTable,
  AdminBadge,
  AdminErrorAlert,
} from '@/components/admin/composed';
import useSubjectListVM from './useSubjectListVM';

const AdminSubjectList: React.FC = () => {
  const vm = useSubjectListVM();
  const navigate = useNavigate();

  if (!vm.isSuperuser) return <Navigate to="/" replace />;

  return (
    <AdminPage>
      <AdminPageHeader
        title="Subjects"
        actions={[
          { label: 'Upload Subject', icon: Upload, variant: 'outline', onClick: () => navigate('/admin/subjects/import') },
          { label: 'Add New Subject', icon: Plus, onClick: () => navigate('/admin/subjects/new') },
        ]}
      />
      <AdminErrorAlert message={vm.error} />
      <AdminDataTable
        columns={[
          { key: 'code', header: 'Code', sortable: true },
          { key: 'description', header: 'Description' },
          { key: 'active', header: 'Status', render: (val) => <AdminBadge active={val} /> },
        ]}
        data={vm.subjects}
        loading={vm.loading}
        emptyMessage="No subjects found"
        pagination={{
          page: vm.page,
          pageSize: vm.rowsPerPage,
          total: vm.totalCount,
          onPageChange: vm.handleChangePage,
          onPageSizeChange: vm.handleChangeRowsPerPage,
          pageSizeOptions: [25, 50, 100],
        }}
        actions={(row) => [
          { label: 'View', icon: Eye, onClick: () => navigate(`/admin/subjects/${row.id}`) },
          { label: 'Edit', icon: Pencil, onClick: () => navigate(`/admin/subjects/${row.id}/edit`) },
          { label: 'Delete', icon: Trash2, variant: 'destructive' as const, onClick: () => vm.handleDelete(row.id) },
        ]}
      />
    </AdminPage>
  );
};

export default AdminSubjectList;
