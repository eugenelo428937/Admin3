import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/admin/ui/badge';
import { Button } from '@/components/admin/ui/button';
import EmailToFilter from '../shared/EmailToFilter';
import { useEmailBatchDrawerVM } from './useEmailBatchDrawerVM';
import type { BatchStatus } from '../../../../types/email';

const STATUS_BADGE_CLASS: Record<BatchStatus, string> = {
    pending: 'tw:border-admin-border tw:bg-admin-bg-muted tw:text-admin-fg-muted',
    processing: 'tw:border-blue-200 tw:bg-blue-50 tw:text-blue-700',
    completed: 'tw:border-admin-success/30 tw:bg-admin-success/10 tw:text-admin-success',
    completed_with_errors: 'tw:border-amber-200 tw:bg-amber-50 tw:text-amber-700',
    failed: 'tw:border-admin-destructive/30 tw:bg-admin-destructive/10 tw:text-admin-destructive',
};

const STATUS_LABEL: Record<BatchStatus, string> = {
    pending: 'Queued',
    processing: 'Processing',
    completed: 'Completed',
    completed_with_errors: 'With Errors',
    failed: 'Failed',
};

const EMAIL_STATUS_CLASS: Record<string, string> = {
    pending: 'tw:border-admin-border tw:bg-admin-bg-muted tw:text-admin-fg-muted',
    processing: 'tw:border-blue-200 tw:bg-blue-50 tw:text-blue-700',
    sent: 'tw:border-admin-success/30 tw:bg-admin-success/10 tw:text-admin-success',
    failed: 'tw:border-admin-destructive/30 tw:bg-admin-destructive/10 tw:text-admin-destructive',
    cancelled: 'tw:border-amber-200 tw:bg-amber-50 tw:text-amber-700',
    retry: 'tw:border-purple-200 tw:bg-purple-50 tw:text-purple-700',
};

const formatRelativeTime = (dateString: string | null): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'just now';
};

interface EmailBatchDrawerProps {
    batchId: string | null;
    onClose: () => void;
}

const EmailBatchDrawer: React.FC<EmailBatchDrawerProps> = ({ batchId, onClose }) => {
    const vm = useEmailBatchDrawerVM(batchId);

    if (!batchId) return null;

    return (
        <div className="tw:fixed tw:inset-y-0 tw:right-0 tw:w-[480px] tw:bg-white tw:border-l tw:border-admin-border tw:shadow-lg tw:z-50 tw:flex tw:flex-col">
            {/* Header */}
            <div className="tw:flex tw:items-center tw:justify-between tw:px-4 tw:py-3 tw:border-b tw:border-admin-border">
                <div>
                    <h3 className="tw:text-sm tw:font-semibold tw:text-admin-fg">
                        {vm.batch?.template_name || 'Loading...'}
                    </h3>
                    <p className="tw:text-xs tw:text-admin-fg-muted tw:mt-0.5">
                        Batch {batchId.substring(0, 8)} · {vm.batch?.total_items ?? '...'} emails
                    </p>
                </div>
                <Button variant="ghost" size="icon-xs" onClick={onClose}>
                    <X className="tw:size-4" />
                </Button>
            </div>

            {/* Summary bar */}
            {vm.batch && (
                <div className="tw:flex tw:items-center tw:gap-4 tw:px-4 tw:py-2 tw:bg-admin-bg-muted tw:border-b tw:border-admin-border tw:text-xs">
                    <div className="tw:flex tw:items-center tw:gap-1.5">
                        <span className="tw:text-admin-fg-muted">Status:</span>
                        <Badge variant="outline" className={STATUS_BADGE_CLASS[vm.batch.status]}>
                            {STATUS_LABEL[vm.batch.status]}
                        </Badge>
                    </div>
                    <div>
                        <span className="tw:text-admin-fg-muted">Sent:</span>{' '}
                        <span className="tw:font-medium">{vm.batch.sent_count}/{vm.batch.total_items}</span>
                    </div>
                    <div>
                        <span className="tw:text-admin-fg-muted">Errors:</span>{' '}
                        <span className="tw:font-medium">{vm.batch.error_count}</span>
                    </div>
                </div>
            )}

            {/* To filter */}
            <div className="tw:px-4 tw:py-2 tw:border-b tw:border-admin-border">
                <EmailToFilter
                    value={vm.toFilter}
                    onChange={vm.setToFilter}
                    placeholder="Filter by recipient..."
                />
            </div>

            {/* Email list */}
            <div className="tw:flex-1 tw:overflow-y-auto">
                {vm.loading ? (
                    <div className="tw:p-4 tw:text-sm tw:text-admin-fg-muted">Loading...</div>
                ) : vm.emails.length === 0 ? (
                    <div className="tw:p-4 tw:text-sm tw:text-admin-fg-muted">No emails found.</div>
                ) : (
                    vm.emails.map((email) => (
                        <a
                            key={email.id}
                            href={`/admin/email/queue/${email.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tw:flex tw:items-center tw:gap-2 tw:px-4 tw:py-2 tw:border-b tw:border-admin-border/50 tw:text-xs hover:tw:bg-admin-bg-muted tw:no-underline tw:text-inherit tw:cursor-pointer"
                        >
                            <div className="tw:flex-1 tw:min-w-0">
                                <div className="tw:text-admin-fg tw:truncate">
                                    {email.to_emails.length > 0 ? email.to_emails[0] : '-'}
                                </div>
                                <div className="tw:text-admin-fg-muted tw:truncate tw:mt-0.5" style={{ fontSize: '10px' }}>
                                    {email.subject || '-'}
                                </div>
                            </div>
                            <Badge variant="outline" className={EMAIL_STATUS_CLASS[email.status] || ''}>
                                {email.status}
                            </Badge>
                            <span className="tw:text-admin-fg-muted tw:whitespace-nowrap">
                                {email.status === 'failed' && email.error_message
                                    ? email.error_message.substring(0, 20)
                                    : formatRelativeTime(email.sent_at)}
                            </span>
                            <ExternalLink className="tw:size-3 tw:text-admin-fg-muted tw:shrink-0" />
                        </a>
                    ))
                )}
                {vm.totalCount > vm.emails.length && (
                    <div className="tw:p-2 tw:text-center tw:text-xs tw:text-admin-fg-muted">
                        Showing {vm.emails.length} of {vm.totalCount}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmailBatchDrawer;
