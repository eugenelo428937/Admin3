import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/components/admin/styles/cn';

interface AdminBadgeProps {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  className?: string;
}

function AdminBadge({
  active,
  className,
}: AdminBadgeProps) {
  if (!active) return null;

  return (
    <Check className={cn('tw:size-4 tw:text-admin-success', className)} />
  );
}

export { AdminBadge };
export type { AdminBadgeProps };
