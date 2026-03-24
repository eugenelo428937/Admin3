import React from 'react';
import { Navigate } from 'react-router-dom';
import {
  AdminPage,
  AdminFormLayout,
  AdminFormField,
} from '@/components/admin/composed';
import { Input } from '@/components/admin/ui/input';
import useExamSessionFormVM from './useExamSessionFormVM';

const AdminExamSessionForm: React.FC = () => {
  const vm = useExamSessionFormVM();

  if (!vm.isSuperuser) return <Navigate to="/" replace />;

  return (
    <AdminPage>
      <AdminFormLayout
        title={`${vm.isEditMode ? 'Edit' : 'Create'} Exam Session`}
        onSubmit={vm.handleSubmit}
        onCancel={vm.handleCancel}
        loading={vm.isSubmitting}
        error={vm.error}
        submitLabel={`${vm.isSubmitting ? 'Saving...' : vm.isEditMode ? 'Update' : 'Create'} Exam Session`}
      >
        <AdminFormField label="Session Code" required>
          <Input
            name="session_code"
            value={vm.formData.session_code}
            onChange={vm.handleChange}
            disabled={vm.isSubmitting}
          />
        </AdminFormField>

        <AdminFormField label="Start Date" required>
          <Input
            type="datetime-local"
            name="start_date"
            value={vm.formData.start_date}
            onChange={vm.handleChange}
            disabled={vm.isSubmitting}
          />
        </AdminFormField>

        <AdminFormField label="End Date" required>
          <Input
            type="datetime-local"
            name="end_date"
            value={vm.formData.end_date}
            onChange={vm.handleChange}
            disabled={vm.isSubmitting}
          />
        </AdminFormField>
      </AdminFormLayout>
    </AdminPage>
  );
};

export default AdminExamSessionForm;
