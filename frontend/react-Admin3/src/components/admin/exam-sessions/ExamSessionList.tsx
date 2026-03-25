import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import moment from 'moment';
import {
  AdminPage,
  AdminPageHeader,
  AdminDataTable,
  AdminErrorAlert,
} from '@/components/admin/composed';
import useExamSessionListVM from './useExamSessionListVM';

const AdminExamSessionList: React.FC = () => {
  const vm = useExamSessionListVM();
  const navigate = useNavigate();

  if (!vm.isSuperuser) return <Navigate to="/" replace />;

  return (
    <AdminPage>
      <AdminPageHeader
        title="Exam Sessions"
        actions={[
          { label: 'Create New Exam Session', icon: Plus, onClick: () => navigate('/admin/exam-sessions/new') },
        ]}
      />
      <AdminErrorAlert message={vm.error} />
      <AdminDataTable
        columns={[
          { key: 'session_code', header: 'Session Code', sortable: true },
          { key: 'start_date', header: 'Start Date', render: (val) => moment(val).format('YYYY-MM-DD HH:mm') },
          { key: 'end_date', header: 'End Date', render: (val) => moment(val).format('YYYY-MM-DD HH:mm') },
        ]}
        data={vm.examSessions}
        loading={vm.loading}
        emptyMessage="No exam sessions found"
        pagination={{
          page: vm.page,
          pageSize: vm.rowsPerPage,
          total: vm.totalCount,
          onPageChange: vm.handleChangePage,
          onPageSizeChange: vm.handleChangeRowsPerPage,
          pageSizeOptions: [25, 50, 100],
        }}
        actions={(row) => [
          { label: 'Edit', icon: Pencil, onClick: () => navigate(`/admin/exam-sessions/${row.id}/edit`) },
          { label: 'Delete', icon: Trash2, variant: 'destructive' as const, onClick: () => vm.handleDelete(row.id) },
        ]}
      />
    </AdminPage>
  );
};

export default AdminExamSessionList;
