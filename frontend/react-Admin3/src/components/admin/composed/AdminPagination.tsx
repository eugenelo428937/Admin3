import * as React from 'react';
import { Button } from '@/components/admin/ui/button';
import { cn } from '@/components/admin/styles/cn';

interface AdminPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onPageSizeChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  pageSizeOptions?: number[];
  className?: string;
}

function AdminPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
  className,
}: AdminPaginationProps) {
  const start = page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, total);

  if (total <= pageSize) return null;

  return (
    <div
      className={cn(
        'tw:flex tw:items-center tw:justify-between tw:px-2 tw:text-sm tw:text-admin-fg-muted',
        className
      )}
    >
      <span>
        Showing {start}&ndash;{end} of {total}
      </span>
      <div className="tw:flex tw:items-center tw:gap-4">
        {onPageSizeChange && (
          <div className="tw:flex tw:items-center tw:gap-2">
            <span>Rows per page</span>
            <select
              className="tw:h-8 tw:rounded-md tw:border tw:border-admin-border tw:bg-transparent tw:px-2 tw:text-sm"
              value={pageSize}
              onChange={onPageSizeChange}
            >
              {(pageSizeOptions ?? [10, 20, 50]).map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="tw:flex tw:items-center tw:gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={(e) => onPageChange(e, page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={end >= total}
            onClick={(e) => onPageChange(e, page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export { AdminPagination };
export type { AdminPaginationProps };
