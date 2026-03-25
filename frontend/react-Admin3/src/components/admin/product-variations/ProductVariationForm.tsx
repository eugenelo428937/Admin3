import React from 'react';
import { Navigate } from 'react-router-dom';
import {
  AdminPage,
  AdminFormLayout,
  AdminFormField,
  AdminSelect,
} from '@/components/admin/composed';
import { Input } from '@/components/admin/ui/input';
import { Textarea } from '@/components/admin/ui/textarea';
import useProductVariationFormVM from './useProductVariationFormVM';

const VARIATION_TYPES = [
  { value: 'eBook', label: 'eBook' },
  { value: 'Hub', label: 'Hub' },
  { value: 'Printed', label: 'Printed' },
  { value: 'Marking', label: 'Marking' },
  { value: 'Tutorial', label: 'Tutorial' },
];

const AdminProductVariationForm: React.FC = () => {
  const vm = useProductVariationFormVM();

  if (!vm.isSuperuser) return <Navigate to="/" replace />;

  return (
    <AdminPage>
      <AdminFormLayout
        title={vm.isEditMode ? 'Edit Product Variation' : 'Create Product Variation'}
        onSubmit={vm.handleSubmit}
        onCancel={vm.handleCancel}
        loading={vm.loading}
        error={vm.error}
        submitLabel={`${vm.isEditMode ? 'Update' : 'Create'} Product Variation`}
      >
        <AdminFormField label="Variation Type" required>
          <AdminSelect
            options={VARIATION_TYPES}
            value={vm.formData.variation_type}
            onChange={(value) => {
              // Create synthetic event for VM's handleChange
              const syntheticEvent = {
                target: { name: 'variation_type', value }
              } as React.ChangeEvent<HTMLInputElement>;
              vm.handleChange(syntheticEvent);
            }}
            placeholder="Select a variation type"
          />
        </AdminFormField>

        <AdminFormField label="Name" required>
          <Input
            name="name"
            value={vm.formData.name}
            onChange={vm.handleChange}
            placeholder="Enter variation name"
          />
        </AdminFormField>

        <AdminFormField label="Description">
          <Textarea
            name="description"
            value={vm.formData.description}
            onChange={vm.handleChange as any}
            placeholder="Enter variation description"
            rows={3}
          />
        </AdminFormField>

        <AdminFormField label="Code">
          <Input
            name="code"
            value={vm.formData.code}
            onChange={vm.handleChange}
            placeholder="Enter variation code"
          />
        </AdminFormField>
      </AdminFormLayout>
    </AdminPage>
  );
};

export default AdminProductVariationForm;
