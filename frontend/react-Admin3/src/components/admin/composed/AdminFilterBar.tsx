import * as React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/components/admin/styles/cn';
import { Input } from '@/components/admin/ui/input';
import { Button } from '@/components/admin/ui/button';
import { AdminSelect } from './AdminSelect';

interface FilterField {
  key: string;
  label: string;
  type: 'select' | 'search';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface AdminFilterBarProps {
  filters: FilterField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClear?: () => void;
  className?: string;
}

const ALL_SENTINEL = '__all__';

function AdminFilterBar({
  filters,
  values,
  onChange,
  onClear,
  className,
}: AdminFilterBarProps) {
  const hasActiveFilters = Object.values(values).some((v) => v !== '' && v !== ALL_SENTINEL);

  return (
    <div className={cn('tw:flex tw:flex-wrap tw:items-center tw:gap-3', className)}>
      {filters.map((filter) => {
        if (filter.type === 'search') {
          return (
            <div key={filter.key} className="tw:relative">
              <Search className="tw:pointer-events-none tw:absolute tw:top-1/2 tw:left-2.5 tw:size-4 tw:-translate-y-1/2 tw:text-admin-fg-muted" />
              <Input
                placeholder={filter.placeholder ?? `Search ${filter.label.toLowerCase()}\u2026`}
                value={values[filter.key] ?? ''}
                onChange={(e) => onChange(filter.key, e.target.value)}
                className="tw:w-56 tw:pl-9"
              />
            </div>
          );
        }

        if (filter.type === 'select' && filter.options) {
          const selectOptions = [
            { value: ALL_SENTINEL, label: `All ${filter.label}` },
            ...filter.options,
          ];
          return (
            <AdminSelect
              key={filter.key}
              options={selectOptions}
              value={values[filter.key] || ALL_SENTINEL}
              onChange={(val) => onChange(filter.key, val === ALL_SENTINEL ? '' : val)}
              placeholder={filter.placeholder ?? filter.label}
            />
          );
        }

        return null;
      })}

      {onClear && hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="tw:text-admin-fg-muted"
        >
          <X className="tw:size-4" />
          Clear filters
        </Button>
      )}
    </div>
  );
}

export { AdminFilterBar };
export type { AdminFilterBarProps, FilterField };
