import * as React from 'react';
import { Separator } from '@/components/admin/ui/separator';
import { cn } from '@/components/admin/styles/cn';

interface AdminDetailCardProps {
  children: React.ReactNode;
  className?: string;
}

function AdminDetailCard({ children, className }: AdminDetailCardProps) {
  return (
    <div
      className={cn(
        'tw:rounded-[10px] tw:bg-card tw:p-6 tw:transition-shadow tw:duration-200 hover:tw:shadow-[0_2px_12px_rgba(0,0,0,0.06)]',
        className
      )}
    >
      <dl className="tw:space-y-4">{children}</dl>
    </div>
  );
}

interface AdminDetailFieldProps {
  label: string;
  children: React.ReactNode;
}

function AdminDetailField({ label, children }: AdminDetailFieldProps) {
  return (
    <>
      <div>
        <dt className="tw:text-sm tw:font-medium tw:text-admin-fg-muted">
          {label}
        </dt>
        <dd className="tw:mt-1 tw:text-admin-fg">{children}</dd>
      </div>
      <Separator />
    </>
  );
}

export { AdminDetailCard, AdminDetailField };
export type { AdminDetailCardProps, AdminDetailFieldProps };
