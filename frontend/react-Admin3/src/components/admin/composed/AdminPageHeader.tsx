import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/components/admin/styles/cn';
import { Button } from '@/components/admin/ui/button';
import { AdminBreadcrumbs } from './AdminBreadcrumbs';

interface HeaderAction {
  label: string;
  icon?: LucideIcon;
  variant?: 'default' | 'outline' | 'destructive' | 'ghost';
  onClick: () => void;
  disabled?: boolean;
}

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: HeaderAction[];
  className?: string;
}

function AdminPageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <div className={cn('tw-:mb-8', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <AdminBreadcrumbs items={breadcrumbs} className="tw-:mb-4" />
      )}
      <div className="tw-:flex tw-:items-center tw-:justify-between tw-:gap-4">
        <div>
          <h1 className="tw-:text-2xl tw-:font-semibold tw-:tracking-tight tw-:text-admin-fg">
            {title}
          </h1>
          {description && (
            <p className="tw-:mt-1 tw-:text-sm tw-:text-admin-fg-muted">
              {description}
            </p>
          )}
        </div>
        {actions && actions.length > 0 && (
          <div className="tw-:flex tw-:items-center tw-:gap-2">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  variant={action.variant ?? 'default'}
                  onClick={action.onClick}
                  disabled={action.disabled}
                >
                  {Icon && <Icon />}
                  {action.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export { AdminPageHeader };
export type { AdminPageHeaderProps, HeaderAction };
