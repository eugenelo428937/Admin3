import React from 'react';
import { Navigate } from 'react-router-dom';
import {
  AdminPage,
  AdminFormLayout,
  AdminFormField,
  AdminSelect,
} from '@/components/admin/composed';
import { Input } from '@/components/admin/ui/input';
import usePriceFormVM from './usePriceFormVM';

const priceTypes = [
  { value: 'standard', label: 'Standard' },
  { value: 'retaker', label: 'Retaker' },
  { value: 'reduced', label: 'Reduced' },
  { value: 'additional', label: 'Additional' },
];

const AdminPriceForm: React.FC = () => {
  const vm = usePriceFormVM();

  if (!vm.isSuperuser) return <Navigate to="/" replace />;

  return (
    <AdminPage>
      <AdminFormLayout
        title={vm.isEditMode ? 'Edit Price' : 'Add New Price'}
        onSubmit={vm.handleSubmit}
        onCancel={vm.handleCancel}
        loading={vm.loading}
        error={vm.error}
        submitLabel={vm.isEditMode ? 'Update Price' : 'Create Price'}
      >
        <AdminFormField label="Product" required>
          <AdminSelect
            options={vm.storeProducts.map((p) => ({
              value: String(p.id),
              label: p.product_code || `Product ID: ${p.id}`,
            }))}
            value={String(vm.formData.product)}
            onChange={(value) =>
              vm.handleChange({ target: { name: 'product', value } } as any)
            }
            placeholder="Select a product"
          />
        </AdminFormField>

        <AdminFormField label="Price Type" required>
          <AdminSelect
            options={priceTypes}
            value={vm.formData.price_type}
            onChange={(value) =>
              vm.handleChange({ target: { name: 'price_type', value } } as any)
            }
            placeholder="Select a price type"
          />
        </AdminFormField>

        <AdminFormField label="Amount" required>
          <Input
            name="amount"
            type="number"
            value={vm.formData.amount}
            onChange={vm.handleChange as any}
            min={0}
            step="0.01"
          />
        </AdminFormField>

        <AdminFormField label="Currency" required>
          <Input
            name="currency"
            value={vm.formData.currency}
            onChange={vm.handleChange as any}
            maxLength={3}
            placeholder="ISO 4217 currency code (e.g., GBP, USD, EUR)"
          />
        </AdminFormField>
      </AdminFormLayout>
    </AdminPage>
  );
};

export default AdminPriceForm;
