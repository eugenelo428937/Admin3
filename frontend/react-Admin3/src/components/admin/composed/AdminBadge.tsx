import * as React from 'react';
import { cn } from '@/components/admin/styles/cn';
import { Badge } from '@/components/admin/ui/badge';

interface AdminBadgeProps {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  className?: string;
}

function AdminBadge({
  active,
  activeLabel = 'Active',
  inactiveLabel = 'Inactive',
  className,
}: AdminBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        active
          ? 'tw-:border-admin-success/30 tw-:bg-admin-success/10 tw-:text-admin-success'
          : 'tw-:border-admin-border tw-:bg-admin-bg-muted tw-:text-admin-fg-muted',
        className,
      )}
    >
      {active ? activeLabel : inactiveLabel}
    </Badge>
  );
}

export { AdminBadge };
export type { AdminBadgeProps };
