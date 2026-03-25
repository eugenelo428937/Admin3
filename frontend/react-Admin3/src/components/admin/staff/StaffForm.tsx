import React from 'react';
import { Navigate } from 'react-router-dom';
import {
  AdminPage,
  AdminFormLayout,
  AdminFormField,
} from '@/components/admin/composed';
import { Input } from '@/components/admin/ui/input';
import { Checkbox } from '@/components/admin/ui/checkbox';
import { useAuth } from '../../../hooks/useAuth.tsx';
import useStaffFormVM from './useStaffFormVM';

const AdminStaffForm: React.FC = () => {
  const { isSuperuser } = useAuth();
  const vm = useStaffFormVM();

  if (!isSuperuser) return <Navigate to="/" replace />;
  if (vm.loading) return null;

  return (
    <AdminPage>
      <AdminFormLayout
        title={vm.isEditMode ? 'Edit Staff Member' : 'Add New Staff Member'}
        onSubmit={vm.handleSubmit}
        onCancel={vm.handleCancel}
        loading={vm.isSubmitting}
        error={vm.error}
        submitLabel={vm.isEditMode ? 'Update Staff Member' : 'Create Staff Member'}
      >
        <AdminFormField label="User (ID or Email)" required>
          <Input
            name="user"
            value={vm.formData.user}
            onChange={vm.handleChange}
            placeholder="Enter user ID or email address"
            disabled={vm.isSubmitting}
          />
        </AdminFormField>

        <AdminFormField label="Active">
          <div className="tw:flex tw:items-center tw:gap-2">
            <Checkbox
              aria-label="Active"
              name="is_active"
              checked={vm.formData.is_active}
              disabled={vm.isSubmitting}
              onCheckedChange={(checked) => {
                const syntheticEvent = {
                  target: { name: 'is_active', value: '', type: 'checkbox', checked: !!checked },
                } as React.ChangeEvent<HTMLInputElement>;
                vm.handleChange(syntheticEvent);
              }}
            />
            <span className="tw:text-sm tw:text-admin-fg">Active</span>
          </div>
        </AdminFormField>
      </AdminFormLayout>
    </AdminPage>
  );
};

export default AdminStaffForm;
