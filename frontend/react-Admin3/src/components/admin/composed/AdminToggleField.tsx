import * as React from 'react';
import { cn } from '@/components/admin/styles/cn';
import { Switch } from '@/components/admin/ui/switch';

interface AdminToggleFieldProps {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

function AdminToggleField({
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
  className,
}: AdminToggleFieldProps) {
  return (
    <div
      className={cn(
        'tw:flex tw:items-center tw:justify-between tw:py-2.5',
        'tw:[&+&]:border-t tw:[&+&]:border-[var(--border)]',
        className,
      )}
    >
      <div className="tw:flex tw:flex-col">
        <span className="tw:text-[13px] tw:font-medium tw:text-foreground">
          {label}
        </span>
        {description && (
          <span className="tw:text-[11px] tw:text-secondary-foreground">
            {description}
          </span>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

export { AdminToggleField };
export type { AdminToggleFieldProps };
