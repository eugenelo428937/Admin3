import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/components/admin/styles/cn';

interface AdminBreadcrumbsProps {
  items: { label: string; href?: string }[];
  className?: string;
}

function AdminBreadcrumbs({ items, className }: AdminBreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('tw:flex tw:items-center tw:gap-1 tw:text-sm', className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={`${item.label}-${index}`}>
            {index > 0 && (
              <ChevronRight className="tw:size-3.5 tw:text-admin-fg-subtle" />
            )}
            {isLast || !item.href ? (
              <span
                className={cn(
                  isLast
                    ? 'tw:font-medium tw:text-admin-fg'
                    : 'tw:text-admin-fg-muted',
                )}
              >
                {item.label}
              </span>
            ) : (
              <Link
                to={item.href}
                className="tw:text-admin-fg-muted tw:hover:text-admin-fg tw:transition-colors"
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export { AdminBreadcrumbs };
export type { AdminBreadcrumbsProps };
