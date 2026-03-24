import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  AdminPage,
  AdminPageHeader,
  AdminDataTable,
  AdminErrorAlert,
} from '@/components/admin/composed';
import usePriceListVM from './usePriceListVM';

const AdminPriceList: React.FC = () => {
  const vm = usePriceListVM();
  const navigate = useNavigate();

  if (!vm.isSuperuser) return <Navigate to="/" replace />;

  return (
    <AdminPage>
      <AdminPageHeader
        title="Prices"
        description={`${vm.groupedProducts.length} product${vm.groupedProducts.length !== 1 ? 's' : ''}, ${vm.totalCount} price${vm.totalCount !== 1 ? 's' : ''} total`}
        actions={[
          { label: 'Add New Price', icon: Plus, onClick: () => navigate('/admin/prices/new') },
        ]}
      />
      <AdminErrorAlert message={vm.error} />
      <AdminDataTable
        columns={[
          { key: 'product_id', header: 'ID' },
          { key: 'product_code', header: 'Product Code', sortable: true },
          {
            key: 'price_standard' as any,
            header: 'Standard',
            render: (_val, row) =>
              row.prices.standard != null ? `\u00A3${row.prices.standard}` : '\u2014',
            className: 'tw:text-right',
          },
          {
            key: 'price_retaker' as any,
            header: 'Retaker',
            render: (_val, row) =>
              row.prices.retaker != null ? `\u00A3${row.prices.retaker}` : '\u2014',
            className: 'tw:text-right',
          },
          {
            key: 'price_additional' as any,
            header: 'Additional',
            render: (_val, row) =>
              row.prices.additional != null ? `\u00A3${row.prices.additional}` : '\u2014',
            className: 'tw:text-right',
          },
        ]}
        data={vm.groupedProducts}
        loading={vm.loading}
        emptyMessage="No prices found"
        pagination={
          vm.totalCount > vm.rowsPerPage
            ? {
                page: vm.page,
                pageSize: vm.rowsPerPage,
                total: vm.totalCount,
                onPageChange: vm.handleChangePage,
                onPageSizeChange: vm.handleChangeRowsPerPage,
                pageSizeOptions: [100, 200, 500],
              }
            : undefined
        }
        actions={(row) => [
          {
            label: `Edit prices for ${row.product_code}`,
            icon: Pencil,
            onClick: () => navigate(`/admin/prices/${row.price_ids[0]}/edit`),
          },
          {
            label: `Delete prices for ${row.product_code}`,
            icon: Trash2,
            variant: 'destructive' as const,
            onClick: () => vm.handleDeleteProduct(row.price_ids),
          },
        ]}
      />
    </AdminPage>
  );
};

export default AdminPriceList;
