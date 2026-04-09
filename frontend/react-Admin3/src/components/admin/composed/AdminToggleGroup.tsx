import * as React from 'react';
import { cn } from '@/components/admin/styles/cn';

interface ToggleOption<T extends string> {
  value: T;
  label: string;
}

interface AdminToggleGroupProps<T extends string> {
  label?: string;
  options: ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

function AdminToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: AdminToggleGroupProps<T>) {
  return (
    <div className={cn('tw:flex tw:flex-wrap tw:items-center tw:gap-2 tw:mb-4', className)}>
      {label && (
        <span className="tw:mr-1 tw:text-md tw:text-admin-fg-muted">{label}:</span>
      )}
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'tw:inline-flex tw:items-center tw:rounded-full tw:border tw:px-2.5 tw:py-0.5 tw:text-xs tw:font-medium tw:transition-colors',
            value === opt.value
              ? 'tw:border-primary tw:bg-primary tw:text-primary-foreground tw:text-md'
              : 'tw:border-admin-border tw:bg-transparent tw:text-admin-fg-muted tw:hover:bg-admin-bg-muted tw:text-md'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export { AdminToggleGroup };
export type { AdminToggleGroupProps, ToggleOption };
