import * as React from 'react';
import { cn } from '@/components/admin/styles/cn';
import { Skeleton } from '@/components/admin/ui/skeleton';

interface AdminLoadingStateProps {
  rows?: number;
  columns?: number;
  className?: string;
}

function AdminLoadingState({
  rows = 5,
  columns = 4,
  className,
}: AdminLoadingStateProps) {
  return (
    <div className={cn('tw-:w-full tw-:space-y-3', className)}>
      {/* Header row */}
      <div className="tw-:flex tw-:gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="tw-:h-8 tw-:flex-1" />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={`row-${rowIdx}`} className="tw-:flex tw-:gap-4">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={`cell-${rowIdx}-${colIdx}`}
              className="tw-:h-6 tw-:flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export { AdminLoadingState };
export type { AdminLoadingStateProps };
