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
  AdminToggleGroup,
} from '@/components/admin/composed';
import type { ActiveFilter } from '../../../hooks/useAdminProductFilters';
import ProductTable from './ProductTable';
import useProductListVM from './useProductListVM';

const ACTIVE_OPTIONS: Array<{ value: ActiveFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

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

      <AdminToggleGroup
        label="Status"
        options={ACTIVE_OPTIONS}
        value={vm.activeFilter}
        onChange={vm.handleActiveFilter}
      />

      {vm.filterConfigs.map((config) => (
        <AdminToggleGroup
          key={config.name}
          label={config.label}
          options={[
            { value: 'all', label: 'All' },
            ...config.filter_groups.map((g) => ({
              value: String(g.id),
              label: g.name,
            })),
          ]}
          value={vm.groupFilters[config.name] || 'all'}
          onChange={(value: string) => vm.handleGroupFilter(config.name, value)}
        />
      ))}

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
