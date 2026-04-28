import React from 'react';
import { Navigate } from 'react-router-dom';
import {
  Search, X, Inbox, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import {
  AdminPage, AdminPageHeader, AdminErrorAlert, AdminLoadingState,
  AdminEmptyState, AdminPagination,
} from '@/components/admin/composed';
import { Input } from '@/components/admin/ui/input';
import { Button } from '@/components/admin/ui/button';
import { Combobox } from '@/components/admin/ui/combobox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/admin/ui/table';
import useOrderListVM from './useOrderListVM';
import type { AdminOrderListItem } from '../../../types/admin-order.types';

const SortableHeader: React.FC<{
  label: string; field: string; ordering: string;
  onToggle: (field: string) => void;
}> = ({ label, field, ordering, onToggle }) => {
  const isAsc = ordering === field;
  const isDesc = ordering === `-${field}`;
  return (
    <Button
      variant="ghost" size="sm" className="tw:-ml-3 tw:h-8"
      onClick={(e) => { e.stopPropagation(); onToggle(field); }}
    >
      {label}
      {isAsc ? <ArrowUp className="tw:ml-1 tw:size-3.5" />
        : isDesc ? <ArrowDown className="tw:ml-1 tw:size-3.5" />
        : <ArrowUpDown className="tw:ml-1 tw:size-3.5 tw:text-muted-foreground/50" />}
    </Button>
  );
};

const formatStudent = (s: AdminOrderListItem['student']) =>
  `${s.first_name} ${s.last_name} (${s.student_ref ?? '—'})`;

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));

const OrderList: React.FC = () => {
  const vm = useOrderListVM();

  if (!vm.isSuperuser) return <Navigate to="/" replace />;

  const hasActiveFilters = Object.values(vm.filters).some((v) => v !== '');

  return (
    <AdminPage>
      <AdminPageHeader title="Orders" />

      {/* Filter card */}
      <div className="tw:rounded-lg tw:border tw:bg-muted/30 tw:p-4 tw:mb-6">
        <div className="tw:flex tw:items-center tw:justify-between tw:mb-3">
          <span className="tw:text-sm tw:font-semibold">Search & Filters</span>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={vm.clearFilters} className="tw:h-7 tw:text-xs">
              <X className="tw:mr-1 tw:h-3 tw:w-3" /> Clear All
            </Button>
          )}
        </div>

        <div className="tw:flex tw:flex-wrap tw:gap-4 tw:mb-3">
          <div className="tw:w-[130px]">
            <label className="tw:text-[11px] tw:text-muted-foreground tw:uppercase tw:tracking-wider tw:mb-1 tw:block">Ref</label>
            <Input placeholder="Student ref" value={vm.filters.studentRef}
              onChange={(e) => vm.setStudentRef(e.target.value)} />
          </div>
          <div className="tw:flex-1 tw:min-w-[200px]">
            <label className="tw:text-[11px] tw:text-muted-foreground tw:uppercase tw:tracking-wider tw:mb-1 tw:block">Name</label>
            <div className="tw:relative">
              <Search className="tw:pointer-events-none tw:absolute tw:top-1/2 tw:left-2.5 tw:size-4 tw:-translate-y-1/2 tw:text-muted-foreground" />
              <Input placeholder="First or last name..." value={vm.filters.name}
                onChange={(e) => vm.setName(e.target.value)} className="tw:pl-9" />
            </div>
          </div>
        </div>

        <div className="tw:flex tw:flex-wrap tw:gap-4 tw:mb-3">
          <div className="tw:flex-1">
            <label className="tw:text-[11px] tw:text-muted-foreground tw:uppercase tw:tracking-wider tw:mb-1 tw:block">Email</label>
            <Input placeholder="Email address..." value={vm.filters.email}
              onChange={(e) => vm.setEmail(e.target.value)} />
          </div>
        </div>

        <div className="tw:flex tw:flex-wrap tw:gap-4 tw:mb-3">
          <div className="tw:w-[130px]">
            <label className="tw:text-[11px] tw:text-muted-foreground tw:uppercase tw:tracking-wider tw:mb-1 tw:block">Order No</label>
            <Input placeholder="Order #" value={vm.filters.orderNo}
              onChange={(e) => vm.setOrderNo(e.target.value)} />
          </div>
          <div className="tw:flex-1 tw:min-w-[200px]">
            <label className="tw:text-[11px] tw:text-muted-foreground tw:uppercase tw:tracking-wider tw:mb-1 tw:block">Product Code</label>
            <Combobox
              options={vm.productCodeOptions}
              value={vm.filters.productCode}
              onValueChange={vm.setProductCode}
              placeholder="All products"
              searchPlaceholder="Search code or name..."
              emptyMessage="No products found."
            />
          </div>
        </div>

        <div className="tw:flex tw:flex-wrap tw:gap-4">
          <div className="tw:w-[180px]">
            <label className="tw:text-[11px] tw:text-muted-foreground tw:uppercase tw:tracking-wider tw:mb-1 tw:block">Date From</label>
            <Input type="date" value={vm.filters.dateFrom}
              onChange={(e) => vm.setDateFrom(e.target.value)} />
          </div>
          <div className="tw:w-[180px]">
            <label className="tw:text-[11px] tw:text-muted-foreground tw:uppercase tw:tracking-wider tw:mb-1 tw:block">Date To</label>
            <Input type="date" value={vm.filters.dateTo}
              onChange={(e) => vm.setDateTo(e.target.value)} />
          </div>
        </div>
      </div>

      {!vm.loading && (
        <div className="tw:flex tw:justify-between tw:items-center tw:mb-2 tw:text-sm tw:text-muted-foreground">
          <span>{vm.totalCount.toLocaleString()} orders</span>
        </div>
      )}

      <AdminErrorAlert message={vm.error} />

      {vm.loading ? (
        <AdminLoadingState rows={8} columns={4} />
      ) : vm.orders.length === 0 ? (
        <AdminEmptyState title="No orders found" icon={Inbox} />
      ) : (
        <div className="tw:space-y-0">
          <div className="tw:rounded-[10px] tw:bg-card tw:py-2 tw:px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortableHeader label="Order Date" field="created_at"
                      ordering={vm.ordering} onToggle={vm.toggleSort} />
                  </TableHead>
                  <TableHead>
                    <SortableHeader label="Student" field="user__last_name"
                      ordering={vm.ordering} onToggle={vm.toggleSort} />
                  </TableHead>
                  <TableHead>Order Items</TableHead>
                  <TableHead className="tw:w-[100px] tw:text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vm.orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{formatDate(order.created_at)}</TableCell>
                    <TableCell>{formatStudent(order.student)}</TableCell>
                    <TableCell className="tw:max-w-[400px]">
                      <div className="tw:flex tw:items-center tw:gap-2">
                        <span className="tw:truncate tw:font-mono tw:text-xs">
                          {order.item_codes.join(', ')}
                        </span>
                        <span className="tw:inline-block tw:rounded tw:bg-muted tw:px-1.5 tw:py-0.5 tw:text-[10px] tw:font-medium tw:text-muted-foreground tw:whitespace-nowrap">
                          {order.item_count} items
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="tw:text-right">
                      <Button size="sm" variant="outline" onClick={() => vm.onView(order.id)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <AdminPagination
            page={vm.page}
            pageSize={vm.pageSize}
            total={vm.totalCount}
            onPageChange={vm.handleChangePage}
          />
        </div>
      )}
    </AdminPage>
  );
};

export default OrderList;
