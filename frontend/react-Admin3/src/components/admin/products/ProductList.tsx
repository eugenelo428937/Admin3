import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Plus, Upload } from 'lucide-react';
import {
  AdminPage,
  AdminPageHeader,
  AdminErrorAlert,
  AdminEmptyState,
  AdminLoadingState,
  AdminPagination,
} from '@/components/admin/composed';
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
          <AdminPagination
            page={vm.page}
            pageSize={vm.rowsPerPage}
            total={vm.totalCount}
            onPageChange={vm.handleChangePage}
            className="tw:mt-4"
          />
        </>
      )}
    </AdminPage>
  );
};

export default AdminProductList;
