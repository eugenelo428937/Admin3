import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  AdminPage,
  AdminPageHeader,
  AdminDataTable,
  AdminErrorAlert,
} from '@/components/admin/composed';
import useProductVariationListVM from './useProductVariationListVM';

const AdminProductVariationList: React.FC = () => {
  const vm = useProductVariationListVM();
  const navigate = useNavigate();

  if (!vm.isSuperuser) return <Navigate to="/" replace />;

  return (
    <AdminPage>
      <AdminPageHeader
        title="Product Variations"
        actions={[
          { label: 'Create New Product Variation', icon: Plus, onClick: () => navigate('/admin/product-variations/new') },
        ]}
      />
      <AdminErrorAlert message={vm.error} />
      <AdminDataTable
        columns={[
          { key: 'id', header: 'ID' },
          { key: 'variation_type', header: 'Variation Type', render: (val) => val || '-' },
          { key: 'name', header: 'Name', render: (val) => val || '-' },
          { key: 'code', header: 'Code', render: (val) => val || '-' },
        ]}
        data={vm.productVariations}
        loading={vm.loading}
        emptyMessage="No product variations found"
        actions={(row) => [
          { label: 'Edit', icon: Pencil, onClick: () => navigate(`/admin/product-variations/${row.id}/edit`) },
          { label: 'Delete', icon: Trash2, variant: 'destructive' as const, onClick: () => vm.handleDelete(row.id) },
        ]}
      />
    </AdminPage>
  );
};

export default AdminProductVariationList;
