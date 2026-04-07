import * as React from 'react';
import { cn } from '@/components/admin/styles/cn';

interface AdminPageProps {
  children: React.ReactNode;
  className?: string;
}

function AdminPage({ children, className }: AdminPageProps) {
  return (
    <div
      className={cn(
        'tw:mx-auto tw:max-w-7xl tw:px-4 tw:py-8 tw:sm:px-6 tw:lg:px-6',
        className,
      )}
    >
      {children}
    </div>
  );
}

export { AdminPage };
export type { AdminPageProps };
