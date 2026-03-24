import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth.tsx';
import {
  AdminPage, AdminPageHeader, AdminDataTable, AdminBadge, AdminErrorAlert, AdminFilterBar,
} from '@/components/admin/composed';
import useExamSessionSubjectListVM from './useExamSessionSubjectListVM';

const AdminExamSessionSubjectList: React.FC = () => {
  const { isSuperuser } = useAuth();
  const vm = useExamSessionSubjectListVM();
  const navigate = useNavigate();

  if (!isSuperuser) return <Navigate to="/" replace />;

  return (
    <AdminPage>
      <AdminPageHeader
        title="Exam Session Subjects"
        actions={[
          { label: 'Create New ESS Link', icon: Plus, onClick: () => navigate('/admin/exam-session-subjects/new') },
        ]}
      />
      <AdminFilterBar
        filters={[{
          key: 'exam_session',
          label: 'Exam Session',
          type: 'select',
          options: vm.examSessions.map(es => ({ value: String(es.id), label: es.session_code })),
        }]}
        values={{ exam_session: vm.selectedExamSession }}
        onChange={(key, value) => {
          vm.handleExamSessionFilterChange({ target: { name: key, value } } as any);
        }}
        onClear={() => {
          vm.handleExamSessionFilterChange({ target: { name: 'exam_session', value: '' } } as any);
        }}
      />
      <AdminErrorAlert message={vm.error} />
      <AdminDataTable
        columns={[
          { key: 'id', header: 'ID' },
          { key: 'exam_session', header: 'Exam Session', render: (val) => val?.session_code || '-' },
          { key: 'subject', header: 'Subject', render: (val) => val?.code || '-' },
          { key: 'is_active', header: 'Active', render: (val) => <AdminBadge active={val} /> },
        ]}
        data={vm.examSessionSubjects}
        loading={vm.loading}
        emptyMessage="No exam session subjects found"
        actions={(row) => [
          { label: 'Edit', icon: Pencil, onClick: () => navigate(`/admin/exam-session-subjects/${row.id}/edit`) },
          { label: 'Delete', icon: Trash2, variant: 'destructive' as const, onClick: () => vm.handleDelete(row.id) },
        ]}
      />
    </AdminPage>
  );
};

export default AdminExamSessionSubjectList;
