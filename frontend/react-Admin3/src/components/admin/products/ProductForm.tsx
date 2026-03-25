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
import useProductFormVM from './useProductFormVM';

const AdminProductForm: React.FC = () => {
  const vm = useProductFormVM();

  if (!vm.isSuperuser) return <Navigate to="/" replace />;

  return (
    <AdminPage>
      <AdminFormLayout
        title={vm.isEditMode ? 'Edit Product' : 'Add New Product'}
        onSubmit={vm.handleSubmit}
        onCancel={vm.handleCancel}
        loading={vm.loading}
        error={vm.error}
        submitLabel={vm.isEditMode ? 'Update Product' : 'Create Product'}
      >
        <AdminFormField label="Code" required>
          <Input
            name="code"
            value={vm.formData.code}
            onChange={vm.handleChange}
            maxLength={10}
            disabled={vm.isEditMode}
          />
          {vm.isEditMode && (
            <p className="tw:mt-1 tw:text-xs tw:text-admin-fg-muted">
              Codes cannot be changed after creation
            </p>
          )}
        </AdminFormField>

        <AdminFormField label="Full Name" required>
          <Input
            name="fullname"
            value={vm.formData.fullname}
            onChange={vm.handleChange}
          />
        </AdminFormField>

        <AdminFormField label="Short Name" required>
          <Input
            name="shortname"
            value={vm.formData.shortname}
            onChange={vm.handleChange}
            maxLength={20}
          />
        </AdminFormField>

        <AdminFormField label="Description">
          <Textarea
            name="description"
            value={vm.formData.description}
            onChange={vm.handleChange as any}
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

export default AdminProductForm;
