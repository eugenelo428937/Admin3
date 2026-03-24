import * as React from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';
import { cn } from '@/components/admin/styles/cn';
import { Button } from '@/components/admin/ui/button';

interface AdminEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

function AdminEmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: AdminEmptyStateProps) {
  return (
    <div
      className={cn(
        'tw-:flex tw-:flex-col tw-:items-center tw-:justify-center tw-:py-12 tw-:text-center',
        className,
      )}
    >
      <Icon className="tw-:mb-4 tw-:size-12 tw-:text-admin-fg-subtle" />
      <h3 className="tw-:text-lg tw-:font-semibold tw-:text-admin-fg">
        {title}
      </h3>
      {description && (
        <p className="tw-:mt-1 tw-:max-w-sm tw-:text-sm tw-:text-admin-fg-muted">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} className="tw-:mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}

export { AdminEmptyState };
export type { AdminEmptyStateProps };
