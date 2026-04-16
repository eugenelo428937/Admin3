import React from 'react';
import { Navigate } from 'react-router-dom';
import {
  Search,
  X,
  Archive,
  ChevronRight,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  AdminPage,
  AdminPageHeader,
  AdminErrorAlert,
  AdminLoadingState,
  AdminEmptyState,
  AdminPagination,
} from '@/components/admin/composed';
import { Input } from '@/components/admin/ui/input';
import { Button } from '@/components/admin/ui/button';
import { Combobox } from '@/components/admin/ui/combobox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/admin/ui/table';
import useLegacyOrderListVM from './useLegacyOrderListVM';
import type { LegacyOrder, LegacyOrderItem } from '../../../types/legacy-order.types';

const DELIVERY_LABELS: Record<string, string> = {
  H: 'Home',
  W: 'Work',
};

/* ── Badge helper for order item flags ─────────────────────── */
interface BadgeDef {
  key: keyof LegacyOrderItem;
  label: string;
  className: string;
}

const ITEM_BADGES: BadgeDef[] = [
  { key: 'is_retaker', label: 'Retaker', className: 'tw:bg-orange-100 tw:text-orange-800' },
  { key: 'is_reduced', label: 'Reduced', className: 'tw:bg-blue-100 tw:text-blue-800' },
  { key: 'is_additional', label: 'Additional', className: 'tw:bg-purple-100 tw:text-purple-800' },
  { key: 'is_reduced_rate', label: 'Reduced Rate', className: 'tw:bg-teal-100 tw:text-teal-800' },
  { key: 'free_of_charge', label: 'Free', className: 'tw:bg-green-100 tw:text-green-800' },
];

/* ── Sortable column header ──────────────────────────────── */
const SortableHeader: React.FC<{
  label: string;
  field: string;
  ordering: string;
  onToggle: (field: string) => void;
}> = ({ label, field, ordering, onToggle }) => {
  const isAsc = ordering === field;
  const isDesc = ordering === `-${field}`;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="tw:-ml-3 tw:h-8"
      onClick={(e) => {
        e.stopPropagation();
        onToggle(field);
      }}
    >
      {label}
      {isAsc ? (
        <ArrowUp className="tw:ml-1 tw:size-3.5" />
      ) : isDesc ? (
        <ArrowDown className="tw:ml-1 tw:size-3.5" />
      ) : (
        <ArrowUpDown className="tw:ml-1 tw:size-3.5 tw:text-muted-foreground/50" />
      )}
    </Button>
  );
};

/* ── Sub-table: order items ──────────────────────────────── */
const OrderItemsSubTable: React.FC<{ items: LegacyOrderItem[] }> = ({ items }) => (
  <tr>
    <td colSpan={6} className="tw:p-0">
      <div className="tw:bg-muted/30 tw:px-8 tw:py-3">
        <table className="tw:w-full tw:text-sm">
          <thead>
            <tr className="tw:text-xs tw:text-muted-foreground tw:uppercase tw:tracking-wider">
              <th className="tw:text-left tw:pb-2 tw:pr-4">Code</th>
              <th className="tw:text-left tw:pb-2 tw:pr-4">Product Name</th>
              <th className="tw:text-right tw:pb-2 tw:pr-4">Qty</th>
              <th className="tw:text-right tw:pb-2 tw:pr-4">Price</th>
              <th className="tw:text-left tw:pb-2 tw:pr-4">Order No</th>
              <th className="tw:text-left tw:pb-2">Flags</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const badges = ITEM_BADGES.filter((b) => item[b.key]);
              return (
                <tr key={item.id} className="tw:border-t tw:border-muted">
                  <td className="tw:py-1.5 tw:pr-4 tw:font-mono tw:text-xs">
                    {item.full_code ?? '—'}
                  </td>
                  <td className="tw:py-1.5 tw:pr-4 tw:max-w-[300px] tw:truncate">
                    {item.legacy_product_name ?? '—'}
                  </td>
                  <td className="tw:py-1.5 tw:pr-4 tw:text-right">{item.quantity}</td>
                  <td className="tw:py-1.5 tw:pr-4 tw:text-right tw:font-mono">
                    £{item.price}
                  </td>
                  <td className="tw:py-1.5 tw:pr-4">{item.order_no}</td>
                  <td className="tw:py-1.5">
                    <div className="tw:flex tw:gap-1 tw:flex-wrap">
                      {badges.map((b) => (
                        <span
                          key={b.label}
                          className={`tw:inline-block tw:rounded tw:px-1.5 tw:py-0.5 tw:text-[10px] tw:font-medium ${b.className}`}
                        >
                          {b.label}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </td>
  </tr>
);

/* ── Main component ──────────────────────────────────────── */
const LegacyOrderList: React.FC = () => {
  const vm = useLegacyOrderListVM();

  if (!vm.isSuperuser) return <Navigate to="/" replace />;

  const hasActiveFilters =
    vm.filters.ref ||
    vm.filters.name ||
    vm.filters.email ||
    vm.filters.session ||
    vm.filters.subject ||
    vm.filters.dateFrom ||
    vm.filters.dateTo ||
    vm.filters.product;

  return (
    <AdminPage>
      <AdminPageHeader title="Legacy Orders" />

      {/* ── Filter card ───────────────────────────────── */}
      <div className="tw:rounded-lg tw:border tw:bg-muted/30 tw:p-4 tw:mb-6">
        <div className="tw:flex tw:items-center tw:justify-between tw:mb-3">
          <span className="tw:text-sm tw:font-semibold">Search & Filters</span>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={vm.clearFilters}
              className="tw:h-7 tw:text-xs"
            >
              <X className="tw:mr-1 tw:h-3 tw:w-3" />
              Clear All
            </Button>
          )}
        </div>

        {/* Row 1: Ref, Name */}
        <div className="tw:flex tw:flex-wrap tw:gap-4 tw:mb-3">
          <div className="tw:w-[130px]">
            <label className="tw:text-[11px] tw:text-muted-foreground tw:uppercase tw:tracking-wider tw:mb-1 tw:block">
              Ref
            </label>
            <Input
              placeholder="Student ref..."
              value={vm.filters.ref}
              onChange={(e) => vm.setRef(e.target.value)}
            />
          </div>
          <div className="tw:flex-1 tw:min-w-[200px]">
            <label className="tw:text-[11px] tw:text-muted-foreground tw:uppercase tw:tracking-wider tw:mb-1 tw:block">
              Name
            </label>
            <div className="tw:relative">
              <Search className="tw:pointer-events-none tw:absolute tw:top-1/2 tw:left-2.5 tw:size-4 tw:-translate-y-1/2 tw:text-muted-foreground" />
              <Input
                placeholder="First or last name..."
                value={vm.filters.name}
                onChange={(e) => vm.setName(e.target.value)}
                className="tw:pl-9"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Email */}
        <div className="tw:flex tw:flex-wrap tw:gap-4 tw:mb-3">
          <div className="tw:flex-1">
            <label className="tw:text-[11px] tw:text-muted-foreground tw:uppercase tw:tracking-wider tw:mb-1 tw:block">
              Email
            </label>
            <Input
              placeholder="Email address..."
              value={vm.filters.email}
              onChange={(e) => vm.setEmail(e.target.value)}
            />
          </div>
        </div>

        {/* Row 3: Exam Session, Subject */}
        <div className="tw:flex tw:flex-wrap tw:gap-4 tw:mb-3">
          <div className="tw:w-[200px]">
            <label className="tw:text-[11px] tw:text-muted-foreground tw:uppercase tw:tracking-wider tw:mb-1 tw:block">
              Exam Session
            </label>
            <Combobox
              options={vm.sessionOptions}
              value={vm.filters.session}
              onValueChange={vm.setSession}
              placeholder="All sessions"
              searchPlaceholder="Search sessions..."
              emptyMessage="No sessions found."
            />
          </div>
          <div className="tw:w-[200px]">
            <label className="tw:text-[11px] tw:text-muted-foreground tw:uppercase tw:tracking-wider tw:mb-1 tw:block">
              Subject
            </label>
            <Combobox
              options={vm.subjectOptions}
              value={vm.filters.subject}
              onValueChange={vm.setSubject}
              placeholder="All subjects"
              searchPlaceholder="Search subjects..."
              emptyMessage="No subjects found."
            />
          </div>
        </div>

        {/* Row 4: Product */}
        <div className="tw:flex tw:flex-wrap tw:gap-4 tw:mb-3">
          <div className="tw:flex-1">
            <label className="tw:text-[11px] tw:text-muted-foreground tw:uppercase tw:tracking-wider tw:mb-1 tw:block">
              Product
            </label>
            <Combobox
              options={vm.productOptions}
              value={vm.filters.product}
              onValueChange={vm.setProduct}
              placeholder="All products"
              searchPlaceholder="Search code or name..."
              emptyMessage="No products found."
            />
          </div>
        </div>

        {/* Row 5: Date range */}
        <div className="tw:flex tw:flex-wrap tw:gap-4">
          <div className="tw:w-[180px]">
            <label className="tw:text-[11px] tw:text-muted-foreground tw:uppercase tw:tracking-wider tw:mb-1 tw:block">
              Date From
            </label>
            <Input
              type="date"
              value={vm.filters.dateFrom}
              onChange={(e) => vm.setDateFrom(e.target.value)}
            />
          </div>
          <div className="tw:w-[180px]">
            <label className="tw:text-[11px] tw:text-muted-foreground tw:uppercase tw:tracking-wider tw:mb-1 tw:block">
              Date To
            </label>
            <Input
              type="date"
              value={vm.filters.dateTo}
              onChange={(e) => vm.setDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Results count ─────────────────────────────── */}
      {!vm.loading && (
        <div className="tw:flex tw:justify-between tw:items-center tw:mb-2 tw:text-sm tw:text-muted-foreground">
          <span>{vm.totalCount.toLocaleString()} orders</span>
        </div>
      )}

      <AdminErrorAlert message={vm.error} />

      {/* ── Table ─────────────────────────────────────── */}
      {vm.loading ? (
        <AdminLoadingState rows={8} columns={6} />
      ) : vm.orders.length === 0 ? (
        <AdminEmptyState title="No legacy orders found" icon={Archive} />
      ) : (
        <div className="tw:space-y-0">
          <div className="tw:rounded-[10px] tw:bg-card tw:transition-shadow tw:duration-200 hover:tw:shadow-[0_2px_12px_rgba(0,0,0,0.06)] tw:py-2 tw:px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="tw:w-[40px]" />
                  <TableHead>
                    <SortableHeader
                      label="Ref"
                      field="student_ref"
                      ordering={vm.ordering}
                      onToggle={vm.toggleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortableHeader
                      label="Name"
                      field="first_name"
                      ordering={vm.ordering}
                      onToggle={vm.toggleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortableHeader
                      label="Email"
                      field="email"
                      ordering={vm.ordering}
                      onToggle={vm.toggleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortableHeader
                      label="Order Date"
                      field="order_date"
                      ordering={vm.ordering}
                      onToggle={vm.toggleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortableHeader
                      label="Delivery"
                      field="delivery_pref"
                      ordering={vm.ordering}
                      onToggle={vm.toggleSort}
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vm.orders.map((order: LegacyOrder) => {
                  const isExpanded = vm.expandedRows.has(order.id);
                  return (
                    <React.Fragment key={order.id}>
                      <TableRow
                        className="tw:cursor-pointer"
                        onClick={() => vm.toggleRow(order.id)}
                      >
                        <TableCell className="tw:pr-0">
                          {isExpanded ? (
                            <ChevronDown className="tw:size-4 tw:text-muted-foreground" />
                          ) : (
                            <ChevronRight className="tw:size-4 tw:text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="tw:font-mono tw:text-xs">
                          {order.student_ref}
                        </TableCell>
                        <TableCell>
                          {order.first_name} {order.last_name}
                        </TableCell>
                        <TableCell className="tw:text-sm tw:text-muted-foreground">
                          {order.email}
                        </TableCell>
                        <TableCell>{order.order_date}</TableCell>
                        <TableCell>
                          {DELIVERY_LABELS[order.delivery_pref] ?? order.delivery_pref}
                        </TableCell>
                      </TableRow>
                      {isExpanded && <OrderItemsSubTable items={order.items} />}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <AdminPagination
            page={vm.page}
            pageSize={vm.pageSize}
            total={vm.totalCount}
            onPageChange={vm.handleChangePage}
            onPageSizeChange={(e) =>
              vm.handleChangeRowsPerPage(
                e as unknown as React.ChangeEvent<HTMLInputElement>,
              )
            }
          />
        </div>
      )}
    </AdminPage>
  );
};

export default LegacyOrderList;
