import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Plus, Upload } from 'lucide-react';
import {
  AdminPage,
  AdminPageHeader,
  AdminErrorAlert,
  AdminEmptyState,
  AdminLoadingState,
} from '@/components/admin/composed';
import { Button } from '@/components/admin/ui/button';
import ProductTable from './ProductTable.tsx';
import useProductListVM from './useProductListVM';

const AdminProductList: React.FC = () => {
  const vm = useProductListVM();
  const navigate = useNavigate();

  if (!vm.isSuperuser) return <Navigate to="/" replace />;

  return (
    <AdminPage>
      <AdminPageHeader
        title="Products"
        actions={[
          { label: 'Import Products', icon: Upload, variant: 'outline', onClick: () => navigate('/admin/products/import') },
          { label: 'Add New Product', icon: Plus, onClick: () => navigate('/admin/products/new') },
        ]}
      />
      <AdminErrorAlert message={vm.error} />

      {vm.loading ? (
        <AdminLoadingState rows={5} columns={7} />
      ) : vm.products.length === 0 && !vm.error ? (
        <AdminEmptyState title="No products found" />
      ) : (
        <>
          <ProductTable
            products={vm.products}
            onDelete={vm.handleDelete}
          />
          {vm.totalCount > vm.rowsPerPage && (
            <div className="tw:mt-4 tw:flex tw:items-center tw:justify-between tw:text-sm tw:text-admin-fg-muted">
              <span>
                Showing {vm.page * vm.rowsPerPage + 1}&ndash;
                {Math.min((vm.page + 1) * vm.rowsPerPage, vm.totalCount)}{' '}
                of {vm.totalCount}
              </span>
              <div className="tw:flex tw:items-center tw:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => vm.handleChangePage(e, vm.page - 1)}
                  disabled={vm.page === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => vm.handleChangePage(e, vm.page + 1)}
                  disabled={(vm.page + 1) * vm.rowsPerPage >= vm.totalCount}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </AdminPage>
  );
};

export default AdminProductList;
