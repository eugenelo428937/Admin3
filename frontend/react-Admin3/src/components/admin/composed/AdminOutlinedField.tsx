import * as React from 'react';
import { cn } from '@/components/admin/styles/cn';

interface AdminOutlinedFieldProps {
  label: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
  className?: string;
  children: React.ReactElement;
}

function AdminOutlinedField({
  label,
  required = false,
  error,
  hint,
  className,
  children,
}: AdminOutlinedFieldProps) {
  return (
    <div className={cn('tw:relative tw:mb-[18px] last:tw:mb-0', className)}>
      <div className="tw:relative">
        {React.cloneElement(children, {
          className: cn(
            'tw:w-full tw:rounded-lg tw:bg-transparent tw:px-3.5 tw:py-3 tw:text-[13px] tw:font-sans tw:text-foreground tw:outline-none tw:transition-[border-color,box-shadow] tw:duration-200',
            'tw:border-[1.5px] tw:border-[var(--border)]',
            'tw:focus:border-[var(--ring)] tw:focus:shadow-[0_0_0_3px_rgba(0,0,0,0.03)]',
            error && 'tw:border-destructive tw:focus:border-destructive',
            children.props.className,
          ),
        })}
        <label
          className={cn(
            'tw:absolute tw:left-[11px] tw:-top-[7px] tw:bg-card tw:px-1 tw:text-[10.5px] tw:font-medium tw:text-muted-foreground tw:transition-colors tw:duration-200 tw:z-[1]',
            'tw:peer-focus:text-foreground',
          )}
        >
          {label}
          {required && (
            <span className="tw:ml-px tw:text-destructive">*</span>
          )}
        </label>
      </div>
      {hint && !error && (
        <p className="tw:mt-1 tw:pl-3.5 tw:text-[10.5px] tw:text-secondary-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p className="tw:mt-1 tw:pl-3.5 tw:text-[10.5px] tw:text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export { AdminOutlinedField };
export type { AdminOutlinedFieldProps };
