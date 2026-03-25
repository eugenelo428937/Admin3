import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.tsx';
import {
  AdminPage, AdminFormLayout, AdminFormField, AdminSelect,
} from '@/components/admin/composed';
import { Checkbox } from '@/components/admin/ui/checkbox';
import useExamSessionSubjectFormVM from './useExamSessionSubjectFormVM';

const AdminExamSessionSubjectForm: React.FC = () => {
  const { isSuperuser } = useAuth();
  const vm = useExamSessionSubjectFormVM();

  if (!isSuperuser) return <Navigate to="/" replace />;

  return (
    <AdminPage>
      <AdminFormLayout
        title={vm.isEditMode ? 'Edit Exam Session Subject' : 'Create Exam Session Subject'}
        onSubmit={vm.handleSubmit}
        onCancel={vm.handleCancel}
        loading={vm.isSubmitting}
        error={vm.error}
        submitLabel={`${vm.isSubmitting ? 'Saving...' : vm.isEditMode ? 'Update' : 'Create'} Exam Session Subject`}
      >
        <AdminFormField label="Exam Session" required>
          <AdminSelect
            options={vm.examSessions.map(es => ({ value: String(es.id), label: es.session_code }))}
            value={String(vm.formData.exam_session)}
            onChange={(value) => {
              vm.handleSelectChange({ target: { name: 'exam_session', value } } as any);
            }}
            placeholder="Select an exam session"
            disabled={vm.isSubmitting}
          />
        </AdminFormField>

        <AdminFormField label="Subject" required>
          <AdminSelect
            options={vm.subjects.map(s => ({ value: String(s.id), label: s.code }))}
            value={String(vm.formData.subject)}
            onChange={(value) => {
              vm.handleSelectChange({ target: { name: 'subject', value } } as any);
            }}
            placeholder="Select a subject"
            disabled={vm.isSubmitting}
          />
        </AdminFormField>

        <AdminFormField label="Active">
          <div className="tw:flex tw:items-center tw:gap-2">
            <Checkbox
              aria-label="Active"
              name="is_active"
              checked={vm.formData.is_active}
              onCheckedChange={(checked) => {
                vm.handleCheckboxChange({
                  target: { name: 'is_active', checked: !!checked, type: 'checkbox', value: '' }
                } as React.ChangeEvent<HTMLInputElement>);
              }}
              disabled={vm.isSubmitting}
            />
            <span className="tw:text-sm tw:text-admin-fg">Active</span>
          </div>
        </AdminFormField>
      </AdminFormLayout>
    </AdminPage>
  );
};

export default AdminExamSessionSubjectForm;
