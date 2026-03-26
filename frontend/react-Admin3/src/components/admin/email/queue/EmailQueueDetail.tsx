import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Info, Copy, Eye, Code } from 'lucide-react';
import {
    AdminPage,
    AdminErrorAlert,
    AdminLoadingState,
} from '@/components/admin/composed';
import { Badge } from '@/components/admin/ui/badge';
import { Button } from '@/components/admin/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/admin/ui/dialog';
import { useEmailQueueDetailVM } from './useEmailQueueDetailVM';
import type { QueueStatus, QueuePriority } from '../../../../types/email';

const STATUS_BADGE_STYLE: Record<QueueStatus, React.CSSProperties> = {
    pending: { borderColor: '#e2e8f0', backgroundColor: '#f1f5f9', color: '#64748b' },
    processing: { borderColor: '#bfdbfe', backgroundColor: '#eff6ff', color: '#1d4ed8' },
    sent: { borderColor: '#86efac', backgroundColor: '#f0fdf4', color: '#16a34a' },
    failed: { borderColor: '#fca5a5', backgroundColor: '#fef2f2', color: '#dc2626' },
    cancelled: { borderColor: '#fde68a', backgroundColor: '#fffbeb', color: '#d97706' },
    retry: { borderColor: '#d8b4fe', backgroundColor: '#faf5ff', color: '#7c3aed' },
};

const PRIORITY_BADGE_STYLE: Record<QueuePriority, React.CSSProperties> = {
    low: { borderColor: '#e2e8f0', backgroundColor: '#f1f5f9', color: '#64748b' },
    normal: { borderColor: '#bfdbfe', backgroundColor: '#eff6ff', color: '#1d4ed8' },
    high: { borderColor: '#fde68a', backgroundColor: '#fffbeb', color: '#d97706' },
    urgent: { borderColor: '#fca5a5', backgroundColor: '#fef2f2', color: '#dc2626' },
};

const formatDateTime = (dateString: string | null): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
};

const EmailQueueDetail: React.FC = () => {
    const navigate = useNavigate();
    const vm = useEmailQueueDetailVM();

    const [showCcBcc, setShowCcBcc] = useState(false);
    const [showHtmlPreview, setShowHtmlPreview] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [showContextDialog, setShowContextDialog] = useState(false);

    useEffect(() => {
        vm.fetchDetail();
    }, [vm.fetchDetail]);

    if (vm.loading) {
        return (
            <AdminPage>
                <AdminLoadingState rows={8} columns={3} />
            </AdminPage>
        );
    }

    if (vm.error) {
        return (
            <AdminPage>
                <AdminErrorAlert message={vm.error} />
                <Button
                    variant="ghost"
                    onClick={() => navigate('/admin/email/queue')}
                    className="tw:mt-4"
                >
                    <ArrowLeft className="tw:size-4" />
                    Back to Queue
                </Button>
            </AdminPage>
        );
    }

    if (!vm.queueItem) {
        return (
            <AdminPage>
                <div role="alert" className="tw:rounded-md tw:border tw:border-amber-200 tw:bg-amber-50 tw:p-4 tw:text-sm tw:text-amber-800">
                    Queue item not found.
                </div>
                <Button
                    variant="ghost"
                    onClick={() => navigate('/admin/email/queue')}
                    className="tw:mt-4"
                >
                    <ArrowLeft className="tw:size-4" />
                    Back to Queue
                </Button>
            </AdminPage>
        );
    }

    const item = vm.queueItem;

    return (
        <AdminPage>
            {/* Header */}
            <div className="tw:mb-4 tw:flex tw:items-center tw:gap-3">
                <Button variant="ghost" size="icon-sm" onClick={() => navigate('/admin/email/queue')}>
                    <ArrowLeft className="tw:size-4" />
                </Button>
                <h1 className="tw:text-xl tw:font-semibold tw:tracking-tight tw:text-admin-fg">
                    Queue Item Detail
                </h1>
            </div>

            {/* Row 1: Details Panel */}
            <div className="tw:mb-4 tw:rounded-md tw:border tw:border-admin-border tw:p-4">
                <h2 className="tw:mb-3 tw:text-sm tw:font-semibold tw:text-admin-fg tw:uppercase tw:tracking-wide">Details</h2>
                <div style={{ display: 'flex', gap: '24px' }}>
                    {/* LEFT: Addresses */}
                    <div style={{ flex: 1 }}>
                        <div className="tw:mb-2">
                            <p className="tw:text-xs tw:font-medium tw:text-admin-fg-muted">To</p>
                            <p className="tw:mt-0.5 tw:text-sm">{item.to_emails.join(', ') || '-'}</p>
                        </div>
                        <div className="tw:mb-2">
                            <p className="tw:text-xs tw:font-medium tw:text-admin-fg-muted">From</p>
                            <p className="tw:mt-0.5 tw:text-sm">{item.from_email || '-'}</p>
                        </div>
                        {/* Collapsible CC/BCC/Reply-To */}
                        <div>
                            <button
                                onClick={() => setShowCcBcc(!showCcBcc)}
                                className="tw:flex tw:items-center tw:gap-1 tw:text-xs tw:text-admin-fg-muted tw:cursor-pointer tw:bg-transparent tw:border-none tw:p-0"
                                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                {showCcBcc ? <ChevronUp className="tw:size-3" /> : <ChevronDown className="tw:size-3" />}
                                CC, BCC, Reply-To
                            </button>
                            {showCcBcc && (
                                <div className="tw:mt-1 tw:space-y-1 tw:pl-4 tw:text-sm">
                                    <div><span className="tw:text-xs tw:text-admin-fg-muted">CC:</span> {item.cc_emails.length > 0 ? item.cc_emails.join(', ') : '—'}</div>
                                    <div><span className="tw:text-xs tw:text-admin-fg-muted">BCC:</span> {item.bcc_emails.length > 0 ? item.bcc_emails.join(', ') : '—'}</div>
                                    <div><span className="tw:text-xs tw:text-admin-fg-muted">Reply-To:</span> {item.reply_to_email || '—'}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Status info */}
                    <div style={{ flex: 1 }}>
                        <div className="tw:mb-2 tw:flex tw:items-center tw:gap-2">
                            <p className="tw:text-xs tw:font-medium tw:text-admin-fg-muted">Status</p>
                            <Badge variant="outline" style={STATUS_BADGE_STYLE[item.status]}>{item.status}</Badge>
                            {item.status === 'failed' && (
                                <button
                                    onClick={() => setShowErrorDialog(true)}
                                    style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', padding: 0 }}
                                    title="View error message"
                                >
                                    <Info style={{ width: '14px', height: '14px' }} />
                                </button>
                            )}
                        </div>
                        <div className="tw:mb-2">
                            <p className="tw:text-xs tw:font-medium tw:text-admin-fg-muted">Created By</p>
                            <p className="tw:mt-0.5 tw:text-sm">{(item as any).created_by_name || `User #${item.created_by}` || '-'}</p>
                        </div>
                        <div className="tw:mb-2">
                            <p className="tw:text-xs tw:font-medium tw:text-admin-fg-muted">Attempts</p>
                            <p className="tw:mt-0.5 tw:text-sm">{item.attempts} / {item.max_attempts}</p>
                        </div>
                        <div>
                            <p className="tw:text-xs tw:font-medium tw:text-admin-fg-muted">Sent At</p>
                            <p className="tw:mt-0.5 tw:text-sm">{formatDateTime(item.sent_at)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 2: Content Panel */}
            <div className="tw:mb-4 tw:rounded-md tw:border tw:border-admin-border tw:p-4">
                <h2 className="tw:mb-3 tw:text-sm tw:font-semibold tw:text-admin-fg tw:uppercase tw:tracking-wide">Content</h2>
                {/* Line 1: Subject, Template, Priority, Context button */}
                <div className="tw:flex tw:items-center tw:gap-3 tw:flex-wrap tw:text-sm">
                    <div>
                        <span className="tw:text-xs tw:text-admin-fg-muted tw:font-medium">Subject: </span>
                        <span>{item.subject || '-'}</span>
                    </div>
                    <span className="tw:text-admin-border">|</span>
                    <div>
                        <span className="tw:text-xs tw:text-admin-fg-muted tw:font-medium">Template: </span>
                        <span>{item.template_name || '-'}</span>
                    </div>
                    <span className="tw:text-admin-border">|</span>
                    <div className="tw:flex tw:items-center tw:gap-1">
                        <span className="tw:text-xs tw:text-admin-fg-muted tw:font-medium">Priority: </span>
                        <Badge variant="outline" style={PRIORITY_BADGE_STYLE[item.priority as QueuePriority]}>{item.priority}</Badge>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setShowContextDialog(true)} style={{ fontSize: '12px' }}>
                        <Code className="tw:size-3.5" />
                        Context
                    </Button>
                </div>
                {/* Line 2: Preview button */}
                <div className="tw:mt-3">
                    <Button variant="outline" size="sm" onClick={() => setShowHtmlPreview(!showHtmlPreview)} style={{ fontSize: '12px' }}>
                        <Eye className="tw:size-3.5" />
                        {showHtmlPreview ? 'Hide Preview' : 'Preview Email'}
                    </Button>
                </div>
                {/* Preview iframe */}
                {showHtmlPreview && (
                    <div className="tw:mt-3 tw:overflow-hidden tw:rounded-md tw:border tw:border-admin-border">
                        {item.html_content ? (
                            <iframe
                                srcDoc={item.html_content}
                                title="Email HTML Preview"
                                style={{ width: '100%', minHeight: 400, border: 'none' }}
                                sandbox="allow-same-origin"
                            />
                        ) : (
                            <p className="tw:p-4 tw:text-sm tw:text-admin-fg-muted">No HTML content available.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Duplicated From Link */}
            {item.duplicated_from && (
                <div className="tw:mb-4 tw:text-sm">
                    <span className="tw:text-admin-fg-muted">Duplicated from: </span>
                    <Link to={`/admin/email/queue/${item.duplicated_from}`} className="tw:text-blue-600 tw:underline">
                        #{item.duplicated_from}
                    </Link>
                </div>
            )}

            {/* Error Dialog */}
            <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
                <DialogContent className="tw:sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle style={{ color: '#dc2626' }}>Error Message</DialogTitle>
                    </DialogHeader>
                    <pre className="tw:max-h-[300px] tw:overflow-auto tw:rounded-md tw:bg-admin-bg-muted tw:p-3 tw:font-mono tw:text-xs tw:whitespace-pre-wrap">
                        {item.error_message}
                    </pre>
                    {item.error_details && Object.keys(item.error_details).length > 0 && (
                        <pre className="tw:max-h-[200px] tw:overflow-auto tw:rounded-md tw:bg-admin-bg-muted tw:p-3 tw:font-mono tw:text-xs tw:whitespace-pre-wrap">
                            {JSON.stringify(item.error_details, null, 2)}
                        </pre>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                navigator.clipboard.writeText(item.error_message + (item.error_details ? '\n' + JSON.stringify(item.error_details, null, 2) : ''));
                            }}
                        >
                            <Copy className="tw:size-3.5" />
                            Copy
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Context Dialog */}
            <Dialog open={showContextDialog} onOpenChange={setShowContextDialog}>
                <DialogContent className="tw:sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Email Context</DialogTitle>
                    </DialogHeader>
                    {item.email_context && Object.keys(item.email_context).length > 0 ? (
                        <pre className="tw:max-h-[400px] tw:overflow-auto tw:rounded-md tw:bg-admin-bg-muted tw:p-3 tw:font-mono tw:text-xs tw:whitespace-pre-wrap">
                            {JSON.stringify(item.email_context, null, 2)}
                        </pre>
                    ) : (
                        <p className="tw:text-sm tw:text-admin-fg-muted">No context data available.</p>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                navigator.clipboard.writeText(JSON.stringify(item.email_context, null, 2));
                            }}
                        >
                            <Copy className="tw:size-3.5" />
                            Copy
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminPage>
    );
};

export default EmailQueueDetail;
