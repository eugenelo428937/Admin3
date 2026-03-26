import React from 'react';
import { X, ExternalLink, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/admin/ui/badge';
import { Button } from '@/components/admin/ui/button';
import EmailToFilter from '../shared/EmailToFilter';
import { useEmailBatchDrawerVM } from './useEmailBatchDrawerVM';
import type { BatchStatus } from '../../../../types/email';

const STATUS_BADGE_STYLE: Record<BatchStatus, React.CSSProperties> = {
    pending: { borderColor: '#e2e8f0', backgroundColor: '#f1f5f9', color: '#64748b' },
    processing: { borderColor: '#bfdbfe', backgroundColor: '#eff6ff', color: '#1d4ed8' },
    completed: { borderColor: '#86efac', backgroundColor: '#f0fdf4', color: '#16a34a' },
    completed_with_errors: { borderColor: '#fde68a', backgroundColor: '#fffbeb', color: '#d97706' },
    failed: { borderColor: '#fca5a5', backgroundColor: '#fef2f2', color: '#dc2626' },
};

const STATUS_LABEL: Record<BatchStatus, string> = {
    pending: 'Queued',
    processing: 'Processing',
    completed: 'Completed',
    completed_with_errors: 'With Errors',
    failed: 'Failed',
};

const EMAIL_STATUS_STYLE: Record<string, React.CSSProperties> = {
    pending: { borderColor: '#e2e8f0', backgroundColor: '#f1f5f9', color: '#64748b' },
    processing: { borderColor: '#bfdbfe', backgroundColor: '#eff6ff', color: '#1d4ed8' },
    sent: { borderColor: '#86efac', backgroundColor: '#f0fdf4', color: '#16a34a' },
    failed: { borderColor: '#fca5a5', backgroundColor: '#fef2f2', color: '#dc2626' },
    cancelled: { borderColor: '#fde68a', backgroundColor: '#fffbeb', color: '#d97706' },
    retry: { borderColor: '#d8b4fe', backgroundColor: '#faf5ff', color: '#7c3aed' },
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
                <Button
                    variant="outline"
                    size="sm"
                    disabled={!vm.batch || vm.batch.error_count === 0}
                    onClick={vm.handleRetryAllFailed}
                    style={{ fontSize: '12px' }}
                >
                    <RotateCcw className="tw:size-3.5" />
                    Retry All Failed
                </Button>
                <Button variant="ghost" size="icon-xs" onClick={onClose}>
                    <X className="tw:size-4" />
                </Button>
            </div>

            {/* Summary bar */}
            {vm.batch && (
                <div className="tw:flex tw:items-center tw:gap-4 tw:px-4 tw:py-2 tw:bg-admin-bg-muted tw:border-b tw:border-admin-border tw:text-xs">
                    <div className="tw:flex tw:items-center tw:gap-1.5">
                        <span className="tw:text-admin-fg-muted">Status:</span>
                        <Badge variant="outline" style={STATUS_BADGE_STYLE[vm.batch.status]}>
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
                            style={{ backgroundColor: email.status === 'failed' ? '#fef2f2' : undefined }}
                        >
                            <div className="tw:flex-1 tw:min-w-0">
                                <div className="tw:text-admin-fg tw:truncate">
                                    {email.to_emails.length > 0 ? email.to_emails[0] : '-'}
                                </div>
                                <div className="tw:text-admin-fg-muted tw:truncate tw:mt-0.5" style={{ fontSize: '10px' }}>
                                    {email.subject || '-'}
                                </div>
                            </div>
                            <Badge variant="outline" style={EMAIL_STATUS_STYLE[email.status] || {}}>
                                {email.status}
                            </Badge>
                            <span className="tw:text-admin-fg-muted tw:whitespace-nowrap">
                                {email.status === 'failed' && email.error_message
                                    ? email.error_message.substring(0, 20)
                                    : formatRelativeTime(email.sent_at)}
                            </span>
                            {email.status === 'failed' && (
                                <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); vm.handleResendEmail(email.id); }}
                                    style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px', color: '#d97706', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                    title="Resend this email"
                                >
                                    <RotateCcw style={{ width: '14px', height: '14px' }} />
                                </button>
                            )}
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
