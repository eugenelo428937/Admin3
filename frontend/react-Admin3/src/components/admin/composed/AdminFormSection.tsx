import * as React from 'react';
import { cn } from '@/components/admin/styles/cn';

interface AdminFormSectionProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

function AdminFormSection({
  label,
  description,
  children,
  className,
}: AdminFormSectionProps) {
  return (
    <div className={cn('tw:grid tw:grid-cols-[190px_1fr] tw:gap-7 tw:items-start', className)}>
      <div className="tw:pt-3">
        <h3 className="tw:text-[13px] tw:font-medium tw:text-foreground">
          {label}
        </h3>
        {description && (
          <p className="tw:mt-0.5 tw:text-[11px] tw:leading-snug tw:text-secondary-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="tw:rounded-[10px] tw:bg-card tw:p-[22px] tw:transition-shadow tw:duration-200 hover:tw:shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
        {children}
      </div>
    </div>
  );
}

export { AdminFormSection };
export type { AdminFormSectionProps };
