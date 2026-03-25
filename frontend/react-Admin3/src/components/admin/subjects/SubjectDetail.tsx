import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { AdminPage, AdminPageHeader, AdminBadge, AdminErrorAlert } from '@/components/admin/composed';
import { Button } from '@/components/admin/ui/button';
import { Separator } from '@/components/admin/ui/separator';
import useSubjectDetailVM from './useSubjectDetailVM';

const AdminSubjectDetail: React.FC = () => {
  const vm = useSubjectDetailVM();
  const navigate = useNavigate();

  if (!vm.isSuperuser) return <Navigate to="/" replace />;
  if (vm.loading) return <AdminPage><div className="tw:flex tw:justify-center tw:py-16 tw:text-admin-fg-muted">Loading...</div></AdminPage>;
  if (vm.error) return <AdminPage><AdminErrorAlert message={vm.error} /></AdminPage>;
  if (!vm.subject) return <AdminPage><AdminErrorAlert message="Subject not found." /></AdminPage>;

  return (
    <AdminPage>
      <AdminPageHeader
        title={vm.subject.code}
        breadcrumbs={[
          { label: 'Subjects', href: '/admin/subjects' },
          { label: vm.subject.code },
        ]}
        actions={[
          { label: 'Edit', icon: Pencil, onClick: () => navigate(`/admin/subjects/${vm.id}/edit`) },
          { label: 'Delete', icon: Trash2, variant: 'destructive', onClick: vm.handleDelete },
        ]}
      />

      <div className="tw:rounded-md tw:border tw:border-admin-border tw:bg-admin-bg tw:p-6">
        <dl className="tw:space-y-4">
          <div>
            <dt className="tw:text-sm tw:font-medium tw:text-admin-fg-muted">Description</dt>
            <dd className="tw:mt-1 tw:text-admin-fg">{vm.subject.description || 'No description available.'}</dd>
          </div>
          <Separator />
          <div>
            <dt className="tw:text-sm tw:font-medium tw:text-admin-fg-muted">Status</dt>
            <dd className="tw:mt-1"><AdminBadge active={vm.subject.active} /></dd>
          </div>
          <Separator />
          <div>
            <dt className="tw:text-sm tw:font-medium tw:text-admin-fg-muted">Created</dt>
            <dd className="tw:mt-1 tw:text-admin-fg">{new Date(vm.subject.created_at).toLocaleString()}</dd>
          </div>
          <Separator />
          <div>
            <dt className="tw:text-sm tw:font-medium tw:text-admin-fg-muted">Last Updated</dt>
            <dd className="tw:mt-1 tw:text-admin-fg">{new Date(vm.subject.updated_at).toLocaleString()}</dd>
          </div>
        </dl>
      </div>

      <div className="tw:mt-6">
        <Button variant="outline" onClick={vm.handleBack}>
          <ArrowLeft className="tw:mr-2 tw:h-4 tw:w-4" />
          Back to Subjects
        </Button>
      </div>
    </AdminPage>
  );
};

export default AdminSubjectDetail;
