import React from 'react';
import { Navigate } from 'react-router-dom';
import { Search, X, Archive } from 'lucide-react';
import {
  AdminPage,
  AdminPageHeader,
  AdminDataTable,
  AdminErrorAlert,
} from '@/components/admin/composed';
import { Input } from '@/components/admin/ui/input';
import { Button } from '@/components/admin/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/admin/ui/select';
import { Combobox } from '@/components/admin/ui/combobox';
import useLegacyProductListVM from './useLegacyProductListVM';
import { legacyProductColumns } from './legacyProductColumns';

const FORMAT_OPTIONS = [
  { value: 'P', label: 'Printed' },
  { value: 'C', label: 'eBook' },
  { value: 'M', label: 'Marking' },
  { value: 'T', label: 'Tutorial' },
];

const LegacyProductList: React.FC = () => {
  const vm = useLegacyProductListVM();

  if (!vm.isSuperuser) return <Navigate to="/" replace />;

  const hasActiveFilters =
    vm.filters.q || vm.filters.subject || vm.filters.session || vm.filters.delivery;

  return (
    <AdminPage>
      <AdminPageHeader title="Legacy Products" />

      {/* Filter card */}
      <div className="tw:rounded-lg tw:border tw:bg-muted/30 tw:p-4 tw:mb-6">
        <div className="tw:flex tw:items-center tw:justify-between tw:mb-3">
          <span className="tw:text-sm tw:font-semibold">Filters</span>
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
        <div className="tw:flex tw:flex-wrap tw:gap-4">
          {/* Search */}
          <div className="tw:flex-1 tw:min-w-[200px]">
            <label className="tw:text-[11px] tw:text-muted-foreground tw:uppercase tw:tracking-wider tw:mb-1 tw:block">
              Search
            </label>
            <div className="tw:relative">
              <Search className="tw:pointer-events-none tw:absolute tw:top-1/2 tw:left-2.5 tw:size-4 tw:-translate-y-1/2 tw:text-muted-foreground" />
              <Input
                placeholder="Search product name or code..."
                value={vm.filters.q}
                onChange={(e) => vm.setSearchQuery(e.target.value)}
                className="tw:pl-9"
              />
            </div>
          </div>

          {/* Subject combobox */}
          <div className="tw:w-[180px]">
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

          {/* Exam Session combobox */}
          <div className="tw:w-[180px]">
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

          {/* Format select */}
          <div className="tw:w-[150px]">
            <label className="tw:text-[11px] tw:text-muted-foreground tw:uppercase tw:tracking-wider tw:mb-1 tw:block">
              Format
            </label>
            <Select
              value={vm.filters.delivery || '__all__'}
              onValueChange={(val) => vm.setDelivery(val === '__all__' ? '' : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All formats" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All formats</SelectItem>
                {FORMAT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results count */}
      {!vm.loading && (
        <div className="tw:flex tw:justify-between tw:items-center tw:mb-2 tw:text-sm tw:text-muted-foreground">
          <span>{vm.totalCount.toLocaleString()} results</span>
        </div>
      )}

      <AdminErrorAlert message={vm.error} />

      <AdminDataTable
        columns={legacyProductColumns}
        data={vm.products}
        loading={vm.loading}
        emptyMessage="No legacy products found"
        emptyIcon={Archive}
        pagination={{
          page: vm.page,
          pageSize: vm.pageSize,
          total: vm.totalCount,
          onPageChange: vm.handleChangePage,
          onPageSizeChange: vm.handleChangeRowsPerPage,
        }}
      />
    </AdminPage>
  );
};

export default LegacyProductList;
