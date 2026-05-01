import { useCallback, useEffect, useState } from "react";
import emailService from "../../services/emailService";
import type { EmailBatch, BatchStatus } from "../../types/email";
import { DashboardPanel } from "./DashboardPanel";
import {
  AsyncCombobox,
  AsyncOption,
} from "@/components/admin/ui/async-combobox";

const STATUS_BADGE: Record<
  BatchStatus,
  { color: string; bg: string; label: string }
> = {
  pending: {
    color: "var(--secondary-foreground)",
    bg: "rgba(0,0,0,0.03)",
    label: "Queued",
  },
  processing: { color: "var(--blue)", bg: "var(--blue-bg)", label: "Processing" },
  completed: { color: "var(--green)", bg: "var(--green-bg)", label: "Completed" },
  completed_with_errors: {
    color: "var(--amber)",
    bg: "var(--amber-bg)",
    label: "With Errors",
  },
  failed: { color: "var(--red)", bg: "var(--red-bg)", label: "Failed" },
};

const BATCH_DOT: Record<BatchStatus, string> = {
  pending: "rgba(0,0,0,0.1)",
  processing: "var(--blue)",
  completed: "var(--green)",
  completed_with_errors: "var(--amber)",
  failed: "var(--red)",
};

const formatRelativeTime = (dateString: string | null): string => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return "just now";
};

interface EmailBatchesPanelProps {
  className?: string;
}

export function EmailBatchesPanel({ className }: EmailBatchesPanelProps) {
  const [batches, setBatches] = useState<EmailBatch[]>([]);
  const [templateId, setTemplateId] = useState<string>("");
  const [templateLabel, setTemplateLabel] = useState<string>("");

  const fetchTemplateOptions = useCallback(
    async (query: string): Promise<AsyncOption[]> => {
      const params: Record<string, any> = { page_size: 25 };
      if (query) params.search = query;
      const res = await emailService.getTemplates(params);
      return res.results.map((t: any) => ({
        value: String(t.id),
        label: t.display_name || t.name,
      }));
    },
    [],
  );

  useEffect(() => {
    const params: Record<string, any> = { limit: 5 };
    if (templateId) params.template_id = templateId;
    emailService
      .getBatches(params)
      .then((res) => setBatches(res.results))
      .catch(() => setBatches([]));
  }, [templateId]);

  return (
    <DashboardPanel
      title="Email Batches"
      viewAllHref="/admin/email/batches"
      className={className}
      search={
        <div className="tw:w-72">
          <AsyncCombobox
            value={templateId}
            selectedLabel={templateLabel || undefined}
            onValueChange={(val, opt) => {
              setTemplateId(val);
              setTemplateLabel(opt?.label ?? "");
            }}
            fetchOptions={fetchTemplateOptions}
            placeholder="All templates"
            searchPlaceholder="Search template name..."
            emptyMessage="No templates found."
          />
        </div>
      }
    >
      {batches.length === 0 ? (
        <div className="tw:px-[18px] tw:py-3 tw:text-xs tw:text-muted-foreground">
          No recent batches.
        </div>
      ) : (
        batches.map((batch, idx) => {
          const style = STATUS_BADGE[batch.status];
          return (
            <div
              key={batch.batch_id}
              className={`tw:flex tw:items-center tw:gap-2.5 tw:px-[18px] tw:py-[9px] tw:transition-colors hover:tw:bg-[rgba(0,0,0,0.012)] ${
                idx > 0 ? "tw:border-t tw:border-[var(--border)]" : ""
              }`}
            >
              <div
                className="tw:size-1.5 tw:rounded-full tw:shrink-0"
                style={{ background: BATCH_DOT[batch.status] }}
              />
              <div className="tw:flex-1 tw:min-w-0">
                <div className="tw:text-sm tw:font-medium tw:truncate">
                  {batch.template_name || "Unknown"}
                </div>
                <div className="tw:text-[10px] tw:text-secondary-foreground tw:mt-px">
                  {batch.requested_by} · {formatRelativeTime(batch.created_at)}
                </div>
              </div>
              <div className="tw:text-right">
                <div className="tw:font-mono tw:text-[11px] tw:text-muted-foreground">
                  {batch.sent_count}/{batch.total_items}
                </div>
                <span
                  className="tw:inline-block tw:mt-0.5 tw:text-[9px] tw:font-semibold tw:uppercase tw:tracking-[0.04em] tw:rounded tw:px-[7px] tw:py-0.5"
                  style={{ background: style.bg, color: style.color }}
                >
                  {style.label}
                </span>
              </div>
            </div>
          );
        })
      )}
    </DashboardPanel>
  );
}
