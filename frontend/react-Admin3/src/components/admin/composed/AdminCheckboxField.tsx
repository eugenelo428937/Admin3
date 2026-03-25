import * as React from 'react';
import { Checkbox } from '@/components/admin/ui/checkbox';
import { cn } from '@/components/admin/styles/cn';

interface AdminCheckboxFieldProps {
  name: string;
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  description?: string;
  disabled?: boolean;
  className?: string;
}

function AdminCheckboxField({
  name,
  label,
  checked,
  onChange,
  description,
  disabled,
  className,
}: AdminCheckboxFieldProps) {
  return (
    <div className={cn('tw:flex tw:items-center tw:gap-2', className)}>
      <Checkbox
        aria-label={label}
        name={name}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(val) => {
          const syntheticEvent = {
            target: { name, value: '', type: 'checkbox', checked: !!val },
          } as React.ChangeEvent<HTMLInputElement>;
          onChange(syntheticEvent);
        }}
      />
      <span className="tw:text-sm tw:text-admin-fg">{label}</span>
      {description && (
        <span className="tw:text-xs tw:text-admin-fg-muted">{description}</span>
      )}
    </div>
  );
}

export { AdminCheckboxField };
export type { AdminCheckboxFieldProps };
