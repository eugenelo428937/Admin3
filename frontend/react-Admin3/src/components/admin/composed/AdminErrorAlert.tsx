import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/components/admin/styles/cn';

interface AdminErrorAlertProps {
  message: string | null | undefined;
  onRetry?: () => void;
  className?: string;
}

function AdminErrorAlert({ message, onRetry, className }: AdminErrorAlertProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={cn(
        'tw:flex tw:items-start tw:gap-3 tw:rounded-md tw:border tw:border-admin-destructive/30 tw:bg-admin-destructive/10 tw:p-4 tw:text-sm tw:text-admin-destructive',
        className,
      )}
    >
      <AlertCircle className="tw:mt-0.5 tw:size-4 tw:shrink-0" />
      <div className="tw:flex-1">
        <p>{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="tw:mt-1 tw:text-sm tw:font-medium tw:underline tw:underline-offset-4 tw:hover:no-underline"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

export { AdminErrorAlert };
export type { AdminErrorAlertProps };
