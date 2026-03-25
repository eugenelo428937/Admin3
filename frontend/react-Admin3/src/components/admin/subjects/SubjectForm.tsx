import React from 'react';
import { Navigate } from 'react-router-dom';
import {
  AdminPage,
  AdminFormLayout,
  AdminFormField,
  AdminCheckboxField,
} from '@/components/admin/composed';
import { Input } from '@/components/admin/ui/input';
import { Textarea } from '@/components/admin/ui/textarea';
import useSubjectFormVM from './useSubjectFormVM';

const AdminSubjectForm: React.FC = () => {
  const vm = useSubjectFormVM();

  if (!vm.isSuperuser) return <Navigate to="/" replace />;

  return (
    <AdminPage>
      <AdminFormLayout
        title={vm.isEditMode ? 'Edit Subject' : 'Add New Subject'}
        onSubmit={vm.handleSubmit}
        onCancel={vm.handleCancel}
        loading={vm.loading}
        error={vm.error}
        submitLabel={vm.isEditMode ? 'Update Subject' : 'Create Subject'}
      >
        <AdminFormField label="Subject Code" required>
          <Input
            name="code"
            value={vm.formData.code}
            onChange={vm.handleChange}
            placeholder="Enter subject code (e.g. MATH101)"
          />
        </AdminFormField>

        <AdminFormField label="Description">
          <Textarea
            name="description"
            value={vm.formData.description || ''}
            onChange={vm.handleChange as any}
            placeholder="Enter subject description"
            rows={3}
          />
        </AdminFormField>

        <AdminFormField label="Active">
          <AdminCheckboxField
            name="active"
            label="Active"
            checked={vm.formData.active}
            onChange={vm.handleChange}
          />
        </AdminFormField>
      </AdminFormLayout>
    </AdminPage>
  );
};

export default AdminSubjectForm;
