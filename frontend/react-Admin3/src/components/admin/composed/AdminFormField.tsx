import * as React from 'react';
import { cn } from '@/components/admin/styles/cn';
import { Label } from '@/components/admin/ui/label';

interface AdminFormFieldProps {
  label: string;
  required?: boolean;
  error?: string | null;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

function AdminFormField({
  label,
  required = false,
  error,
  description,
  children,
  className,
}: AdminFormFieldProps) {
  return (
    <div className={cn('tw-:space-y-2', className)}>
      <Label>
        {label}
        {required && (
          <span className="tw-:ml-0.5 tw-:text-admin-destructive">*</span>
        )}
      </Label>
      {description && (
        <p className="tw-:text-xs tw-:text-admin-fg-muted">{description}</p>
      )}
      {children}
      {error && (
        <p className="tw-:text-xs tw-:text-admin-destructive">{error}</p>
      )}
    </div>
  );
}

export { AdminFormField };
export type { AdminFormFieldProps };
