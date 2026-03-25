import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Pencil, Trash2, ArrowLeft } from 'lucide-react';
import {
  AdminPage,
  AdminPageHeader,
  AdminBadge,
  AdminErrorAlert,
  AdminDetailCard,
  AdminDetailField,
} from '@/components/admin/composed';
import { Button } from '@/components/admin/ui/button';
import useProductDetailVM from './useProductDetailVM';

const AdminProductDetail: React.FC = () => {
  const vm = useProductDetailVM();
  const navigate = useNavigate();

  if (!vm.isSuperuser) return <Navigate to="/" replace />;
  if (vm.loading) return <AdminPage><div className="tw:flex tw:justify-center tw:py-16 tw:text-admin-fg-muted">Loading...</div></AdminPage>;
  if (vm.error) return <AdminPage><AdminErrorAlert message={vm.error} /></AdminPage>;
  if (!vm.product) return <AdminPage><AdminErrorAlert message="Product not found" /></AdminPage>;

  return (
    <AdminPage>
      <AdminPageHeader
        title="Product Details"
        actions={[
          { label: 'Edit', icon: Pencil, onClick: () => navigate(`/admin/products/${vm.product!.id}/edit`) },
          { label: 'Delete', icon: Trash2, variant: 'destructive', onClick: vm.handleDelete },
        ]}
      />

      <h2 className="tw:text-xl tw:font-semibold tw:text-admin-fg tw:mb-4">
        {vm.product.fullname}
      </h2>
      <AdminDetailCard>
        <AdminDetailField label="Code">
          {vm.product.code}
        </AdminDetailField>
        <AdminDetailField label="Short Name">
          {vm.product.shortname}
        </AdminDetailField>
        <AdminDetailField label="Description">
          {vm.product.description || 'No description'}
        </AdminDetailField>
        <AdminDetailField label="Status">
          <AdminBadge active={vm.product.active} />
        </AdminDetailField>
        <AdminDetailField label="Created">
          {new Date(vm.product.created_at).toLocaleString()}
        </AdminDetailField>
        <AdminDetailField label="Last Updated">
          {new Date(vm.product.updated_at).toLocaleString()}
        </AdminDetailField>
      </AdminDetailCard>

      <div className="tw:mt-6">
        <Button variant="outline" onClick={() => navigate('/admin/products')}>
          <ArrowLeft className="tw:mr-2 tw:h-4 tw:w-4" />
          Back to List
        </Button>
      </div>
    </AdminPage>
  );
};

export default AdminProductDetail;
