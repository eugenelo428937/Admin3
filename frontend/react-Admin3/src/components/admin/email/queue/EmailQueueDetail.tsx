import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import {
    AdminPage,
    AdminErrorAlert,
    AdminLoadingState,
} from '@/components/admin/composed';
import { Badge } from '@/components/admin/ui/badge';
import { Button } from '@/components/admin/ui/button';
import { Separator } from '@/components/admin/ui/separator';
import { useEmailQueueDetailVM } from './useEmailQueueDetailVM';
import type { QueueStatus } from '../../../../types/email';

const STATUS_BADGE_CLASS: Record<QueueStatus, string> = {
    pending: 'tw:border-admin-border tw:bg-admin-bg-muted tw:text-admin-fg-muted',
    processing: 'tw:border-blue-200 tw:bg-blue-50 tw:text-blue-700',
    sent: 'tw:border-admin-success/30 tw:bg-admin-success/10 tw:text-admin-success',
    failed: 'tw:border-admin-destructive/30 tw:bg-admin-destructive/10 tw:text-admin-destructive',
    cancelled: 'tw:border-amber-200 tw:bg-amber-50 tw:text-amber-700',
    retry: 'tw:border-purple-200 tw:bg-purple-50 tw:text-purple-700',
};

const formatDateTime = (dateString: string | null): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
};

const EmailQueueDetail: React.FC = () => {
    const navigate = useNavigate();
    const vm = useEmailQueueDetailVM();

    const [showErrorDetails, setShowErrorDetails] = useState(false);
    const [showHtmlPreview, setShowHtmlPreview] = useState(false);
    const [showContext, setShowContext] = useState(false);

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
            <div className="tw:mb-6 tw:flex tw:items-center tw:gap-3">
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => navigate('/admin/email/queue')}
                >
                    <ArrowLeft className="tw:size-4" />
                </Button>
                <h1 className="tw:text-2xl tw:font-semibold tw:tracking-tight tw:text-admin-fg">
                    Queue Item Detail
                </h1>
                <Badge variant="outline" className={STATUS_BADGE_CLASS[item.status]}>
                    {item.status}
                </Badge>
            </div>

            {/* Section 1: Recipients */}
            <div className="tw:mb-4 tw:rounded-md tw:border tw:border-admin-border tw:p-5">
                <h2 className="tw:mb-2 tw:text-lg tw:font-semibold tw:text-admin-fg">Recipients</h2>
                <Separator className="tw:mb-4" />
                <div className="tw:grid tw:grid-cols-1 tw:gap-4 tw:md:grid-cols-2">
                    <div>
                        <p className="tw:text-xs tw:font-medium tw:text-admin-fg-muted">To</p>
                        {item.to_emails.length > 0 ? (
                            <ul className="tw:mt-1 tw:space-y-0.5">
                                {item.to_emails.map((email: string, index: number) => (
                                    <li key={index} className="tw:text-sm">{email}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="tw:mt-1 tw:text-sm tw:text-admin-fg-muted">-</p>
                        )}
                    </div>
                    <div>
                        <p className="tw:text-xs tw:font-medium tw:text-admin-fg-muted">CC</p>
                        {item.cc_emails.length > 0 ? (
                            <ul className="tw:mt-1 tw:space-y-0.5">
                                {item.cc_emails.map((email: string, index: number) => (
                                    <li key={index} className="tw:text-sm">{email}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="tw:mt-1 tw:text-sm tw:text-admin-fg-muted">-</p>
                        )}
                    </div>
                    <div>
                        <p className="tw:text-xs tw:font-medium tw:text-admin-fg-muted">BCC</p>
                        {item.bcc_emails.length > 0 ? (
                            <ul className="tw:mt-1 tw:space-y-0.5">
                                {item.bcc_emails.map((email: string, index: number) => (
                                    <li key={index} className="tw:text-sm">{email}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="tw:mt-1 tw:text-sm tw:text-admin-fg-muted">-</p>
                        )}
                    </div>
                    <div>
                        <p className="tw:text-xs tw:font-medium tw:text-admin-fg-muted">From</p>
                        <p className="tw:mt-1 tw:text-sm">{item.from_email || '-'}</p>
                    </div>
                    <div>
                        <p className="tw:text-xs tw:font-medium tw:text-admin-fg-muted">Reply-To</p>
                        <p className="tw:mt-1 tw:text-sm">{item.reply_to_email || '-'}</p>
                    </div>
                </div>
            </div>

            {/* Section 2: Content */}
            <div className="tw:mb-4 tw:rounded-md tw:border tw:border-admin-border tw:p-5">
                <h2 className="tw:mb-2 tw:text-lg tw:font-semibold tw:text-admin-fg">Content</h2>
                <Separator className="tw:mb-4" />
                <div className="tw:grid tw:grid-cols-1 tw:gap-4 tw:md:grid-cols-3">
                    <div>
                        <p className="tw:text-xs tw:font-medium tw:text-admin-fg-muted">Subject</p>
                        <p className="tw:mt-1 tw:text-sm">{item.subject || '-'}</p>
                    </div>
                    <div>
                        <p className="tw:text-xs tw:font-medium tw:text-admin-fg-muted">Template</p>
                        <p className="tw:mt-1 tw:text-sm">{item.template_name || '-'}</p>
                    </div>
                    <div>
                        <p className="tw:text-xs tw:font-medium tw:text-admin-fg-muted">Priority</p>
                        <Badge variant="outline" className="tw:mt-1">{item.priority}</Badge>
                    </div>
                </div>
            </div>

            {/* Section 3: Status */}
            <div className="tw:mb-4 tw:rounded-md tw:border tw:border-admin-border tw:p-5">
                <h2 className="tw:mb-2 tw:text-lg tw:font-semibold tw:text-admin-fg">Status</h2>
                <Separator className="tw:mb-4" />
                <div className="tw:grid tw:grid-cols-1 tw:gap-4 tw:md:grid-cols-3">
                    <div>
                        <p className="tw:text-xs tw:font-medium tw:text-admin-fg-muted">Status</p>
                        <Badge variant="outline" className={`tw:mt-1 ${STATUS_BADGE_CLASS[item.status]}`}>
                            {item.status}
                        </Badge>
                    </div>
                    <div>
                        <p className="tw:text-xs tw:font-medium tw:text-admin-fg-muted">Attempts</p>
                        <p className="tw:mt-1 tw:text-sm">{item.attempts} / {item.max_attempts}</p>
                    </div>
                    <div>
                        <p className="tw:text-xs tw:font-medium tw:text-admin-fg-muted">Scheduled At</p>
                        <p className="tw:mt-1 tw:text-sm">{formatDateTime(item.scheduled_at)}</p>
                    </div>
                    <div>
                        <p className="tw:text-xs tw:font-medium tw:text-admin-fg-muted">Sent At</p>
                        <p className="tw:mt-1 tw:text-sm">{formatDateTime(item.sent_at)}</p>
                    </div>
                    <div>
                        <p className="tw:text-xs tw:font-medium tw:text-admin-fg-muted">Last Attempt At</p>
                        <p className="tw:mt-1 tw:text-sm">{formatDateTime(item.last_attempt_at)}</p>
                    </div>
                    <div>
                        <p className="tw:text-xs tw:font-medium tw:text-admin-fg-muted">Next Retry At</p>
                        <p className="tw:mt-1 tw:text-sm">{formatDateTime(item.next_retry_at)}</p>
                    </div>
                </div>
            </div>

            {/* Section 4: Errors (conditional) */}
            {item.error_message && (
                <div className="tw:mb-4 tw:rounded-md tw:border tw:border-admin-border tw:p-5">
                    <h2 className="tw:mb-2 tw:text-lg tw:font-semibold tw:text-admin-destructive">Errors</h2>
                    <Separator className="tw:mb-4" />
                    <div>
                        <p className="tw:text-xs tw:font-medium tw:text-admin-fg-muted">Error Message</p>
                        <p className="tw:mt-1 tw:mb-3 tw:text-sm tw:text-admin-destructive">{item.error_message}</p>
                    </div>
                    {item.error_details && Object.keys(item.error_details).length > 0 && (
                        <div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowErrorDetails(!showErrorDetails)}
                            >
                                Error Details
                                {showErrorDetails ? <ChevronUp className="tw:size-4" /> : <ChevronDown className="tw:size-4" />}
                            </Button>
                            {showErrorDetails && (
                                <pre className="tw:mt-2 tw:max-h-[300px] tw:overflow-auto tw:rounded-md tw:bg-admin-bg-muted tw:p-3 tw:font-mono tw:text-xs">
                                    {JSON.stringify(item.error_details, null, 2)}
                                </pre>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Section 5: HTML Preview */}
            <div className="tw:mb-4 tw:rounded-md tw:border tw:border-admin-border tw:p-5">
                <div className="tw:flex tw:items-center tw:justify-between">
                    <h2 className="tw:text-lg tw:font-semibold tw:text-admin-fg">HTML Preview</h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowHtmlPreview(!showHtmlPreview)}
                    >
                        {showHtmlPreview ? 'Hide' : 'Show'}
                        {showHtmlPreview ? <ChevronUp className="tw:size-4" /> : <ChevronDown className="tw:size-4" />}
                    </Button>
                </div>
                {showHtmlPreview && (
                    <>
                        <Separator className="tw:my-3" />
                        {item.html_content ? (
                            <div className="tw:overflow-hidden tw:rounded-md tw:border tw:border-admin-border">
                                <iframe
                                    srcDoc={item.html_content}
                                    title="Email HTML Preview"
                                    style={{
                                        width: '100%',
                                        minHeight: 400,
                                        border: 'none',
                                    }}
                                    sandbox="allow-same-origin allow-scripts"
                                />
                            </div>
                        ) : (
                            <p className="tw:text-sm tw:text-admin-fg-muted">
                                No HTML content available.
                            </p>
                        )}
                    </>
                )}
            </div>

            {/* Section 6: Context */}
            <div className="tw:mb-4 tw:rounded-md tw:border tw:border-admin-border tw:p-5">
                <div className="tw:flex tw:items-center tw:justify-between">
                    <h2 className="tw:text-lg tw:font-semibold tw:text-admin-fg">Email Context</h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowContext(!showContext)}
                    >
                        {showContext ? 'Hide' : 'Show'}
                        {showContext ? <ChevronUp className="tw:size-4" /> : <ChevronDown className="tw:size-4" />}
                    </Button>
                </div>
                {showContext && (
                    <>
                        <Separator className="tw:my-3" />
                        {item.email_context && Object.keys(item.email_context).length > 0 ? (
                            <pre className="tw:max-h-[400px] tw:overflow-auto tw:rounded-md tw:bg-admin-bg-muted tw:p-3 tw:font-mono tw:text-xs">
                                {JSON.stringify(item.email_context, null, 2)}
                            </pre>
                        ) : (
                            <p className="tw:text-sm tw:text-admin-fg-muted">
                                No context data available.
                            </p>
                        )}
                    </>
                )}
            </div>

            {/* Duplicated From Link */}
            {item.duplicated_from && (
                <div className="tw:mb-4 tw:rounded-md tw:border tw:border-admin-border tw:p-5">
                    <p className="tw:text-xs tw:font-medium tw:text-admin-fg-muted">Duplicated From</p>
                    <Button variant="link" size="sm" asChild className="tw:mt-1 tw:px-0">
                        <Link to={`/admin/email/queue/${item.duplicated_from}`}>
                            View Original (ID: {item.duplicated_from})
                        </Link>
                    </Button>
                </div>
            )}

            {/* Back Button */}
            <div className="tw:mt-6">
                <Button variant="outline" onClick={() => navigate('/admin/email/queue')}>
                    <ArrowLeft className="tw:size-4" />
                    Back to Queue
                </Button>
            </div>
        </AdminPage>
    );
};

export default EmailQueueDetail;
