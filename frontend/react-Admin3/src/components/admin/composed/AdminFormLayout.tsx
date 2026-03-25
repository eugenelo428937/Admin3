import * as React from 'react';
import { cn } from '@/components/admin/styles/cn';
import { Button } from '@/components/admin/ui/button';
import { AdminErrorAlert } from './AdminErrorAlert';

interface AdminFormLayoutProps {
  title: string;
  description?: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
  submitLabel?: string;
  cancelLabel?: string;
  children: React.ReactNode;
  className?: string;
}

function AdminFormLayout({
  title,
  description,
  onSubmit,
  onCancel,
  loading = false,
  error,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  children,
  className,
}: AdminFormLayoutProps) {
  return (
    <form onSubmit={onSubmit} className={cn('tw:space-y-6', className)}>
      <div>
        <h2 className="tw:text-lg tw:font-semibold tw:text-admin-fg">
          {title}
        </h2>
        {description && (
          <p className="tw:mt-1 tw:text-sm tw:text-admin-fg-muted">
            {description}
          </p>
        )}
      </div>

      <AdminErrorAlert message={error} />

      <div className="tw:space-y-4">{children}</div>

      <div className="tw:flex tw:items-center tw:justify-end tw:gap-2 tw:border-t tw:border-admin-border tw:pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          {cancelLabel}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving\u2026' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export { AdminFormLayout };
export type { AdminFormLayoutProps };
