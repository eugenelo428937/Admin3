import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/components/admin/styles/cn";

interface DashboardPanelProps {
  title: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  /** Optional search/filter slot rendered between header and body. */
  search?: ReactNode;
  /** Main content (table, list, etc.). */
  children: ReactNode;
  className?: string;
  /** Optional right-aligned header content (badges, counts, etc.). */
  headerExtra?: ReactNode;
}

/**
 * Reusable dashboard card with header, optional search slot, and body.
 * Shared chrome for Email Batches, Orders, Students, etc.
 */
export function DashboardPanel({
  title,
  viewAllHref,
  viewAllLabel = "View all",
  search,
  children,
  className,
  headerExtra,
}: DashboardPanelProps) {
  return (
    <div
      className={cn(
        "tw:rounded-[10px] tw:bg-card tw:transition-all tw:duration-200",
        "hover:tw:shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:tw:-translate-y-px",
        "tw:px-4 tw:py-2",
        className,
      )}
    >
      <div className="tw:flex tw:items-center tw:justify-between tw:px-[18px] tw:pt-3.5 tw:pb-2.5">
        <span className="tw:text-base tw:font-medium tw:text-muted-foreground tw:tracking-[-0.01em]">
          {title}
        </span>
        <div className="tw:flex tw:items-center tw:gap-2">
          {headerExtra}
          {viewAllHref && (
            <Link
              to={viewAllHref}
              className="tw:text-sm tw:font-medium tw:text-primary tw:no-underline hover:tw:text-[var(--primary-hover)] tw:flex tw:flex-row tw:items-center"
            >
              {viewAllLabel} <ChevronRight className="tw:size-4" />
            </Link>
          )}
        </div>
      </div>

      {search && <div className="tw:px-[18px] tw:pb-2">{search}</div>}

      <div>{children}</div>
    </div>
  );
}
