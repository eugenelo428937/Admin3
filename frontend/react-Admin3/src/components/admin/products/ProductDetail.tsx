import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Pencil, Trash2, ArrowLeft } from 'lucide-react';
import {
  AdminPage,
  AdminPageHeader,
  AdminBadge,
  AdminErrorAlert,
} from '@/components/admin/composed';
import { Button } from '@/components/admin/ui/button';
import { Separator } from '@/components/admin/ui/separator';
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

      <div className="tw:rounded-admin tw:border tw:border-admin-border tw:bg-admin-bg tw:p-6">
        <h2 className="tw:text-xl tw:font-semibold tw:text-admin-fg tw:mb-4">
          {vm.product.fullname}
        </h2>
        <dl className="tw:space-y-4">
          <div>
            <dt className="tw:text-sm tw:font-medium tw:text-admin-fg-muted">Code</dt>
            <dd className="tw:mt-1 tw:text-admin-fg">{vm.product.code}</dd>
          </div>
          <Separator />
          <div>
            <dt className="tw:text-sm tw:font-medium tw:text-admin-fg-muted">Short Name</dt>
            <dd className="tw:mt-1 tw:text-admin-fg">{vm.product.shortname}</dd>
          </div>
          <Separator />
          <div>
            <dt className="tw:text-sm tw:font-medium tw:text-admin-fg-muted">Description</dt>
            <dd className="tw:mt-1 tw:text-admin-fg">{vm.product.description || 'No description'}</dd>
          </div>
          <Separator />
          <div>
            <dt className="tw:text-sm tw:font-medium tw:text-admin-fg-muted">Status</dt>
            <dd className="tw:mt-1">{vm.product.active ? 'Active' : 'Inactive'}</dd>
          </div>
          <Separator />
          <div>
            <dt className="tw:text-sm tw:font-medium tw:text-admin-fg-muted">Created</dt>
            <dd className="tw:mt-1 tw:text-admin-fg">{new Date(vm.product.created_at).toLocaleString()}</dd>
          </div>
          <Separator />
          <div>
            <dt className="tw:text-sm tw:font-medium tw:text-admin-fg-muted">Last Updated</dt>
            <dd className="tw:mt-1 tw:text-admin-fg">{new Date(vm.product.updated_at).toLocaleString()}</dd>
          </div>
        </dl>
      </div>

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
