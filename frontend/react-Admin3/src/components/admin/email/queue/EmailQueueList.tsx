import React, { useEffect, useState } from 'react';
import { MoreHorizontal, Eye, Copy, RotateCcw, FileText, X } from 'lucide-react';
import {
    AdminPage,
    AdminPageHeader,
    AdminErrorAlert,
    AdminLoadingState,
    AdminConfirmDialog,
    AdminToggleGroup,
} from '@/components/admin/composed';
import { Badge } from '@/components/admin/ui/badge';
import { Button } from '@/components/admin/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/admin/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/admin/ui/dropdown-menu';
import { useEmailQueueListVM } from './useEmailQueueListVM';
import type { QueueStatus, EmailQueue } from '../../../../types/email';
import EmailToFilter from '../shared/EmailToFilter';

const STATUS_BADGE_STYLE: Record<QueueStatus, React.CSSProperties> = {
    pending: { borderColor: '#e2e8f0', backgroundColor: '#f1f5f9', color: '#64748b' },
    processing: { borderColor: '#bfdbfe', backgroundColor: '#eff6ff', color: '#1d4ed8' },
    sent: { borderColor: '#86efac', backgroundColor: '#f0fdf4', color: '#16a34a' },
    failed: { borderColor: '#fca5a5', backgroundColor: '#fef2f2', color: '#dc2626' },
    cancelled: { borderColor: '#fde68a', backgroundColor: '#fffbeb', color: '#d97706' },
    retry: { borderColor: '#d8b4fe', backgroundColor: '#faf5ff', color: '#7c3aed' },
};

const STATUS_OPTIONS: Array<QueueStatus | 'all'> = [
    'all',
    'pending',
    'processing',
    'sent',
    'failed',
    'cancelled',
    'retry',
];

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

const truncate = (text: string, maxLength: number): string => {
    if (!text) return '-';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

const EmailQueueList: React.FC = () => {
    const vm = useEmailQueueListVM();
    const [previewItem, setPreviewItem] = useState<EmailQueue | null>(null);

    const handlePreview = (item: EmailQueue) => {
        setPreviewItem(previewItem?.id === item.id ? null : item);
    };

    useEffect(() => {
        vm.fetchQueue();
    }, [vm.fetchQueue]);

    return (
        <AdminPage>
            <AdminPageHeader title="Email Queue" />

            <AdminToggleGroup
                options={STATUS_OPTIONS.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
                value={vm.statusFilter}
                onChange={vm.handleStatusFilter}
                className="tw:mb-4"
            />

            <div className="tw:mb-4 tw:max-w-sm">
                <EmailToFilter
                    value={vm.toFilter}
                    onChange={vm.handleToFilter}
                    placeholder="Filter by recipient email..."
                />
            </div>

            <AdminErrorAlert message={vm.error} />

            {vm.loading ? (
                <AdminLoadingState rows={5} columns={7} />
            ) : vm.queueItems.length === 0 && !vm.error ? (
                <div role="alert" className="tw:rounded-md tw:border tw:border-blue-200 tw:bg-blue-50 tw:p-4 tw:text-sm tw:text-blue-800">
                    No queue items found.
                </div>
            ) : (
                <>
                    <div className="tw:rounded-md tw:border tw:border-admin-border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Template</TableHead>
                                    <TableHead>To</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead style={{ textAlign: 'center' }}>Status</TableHead>
                                    <TableHead style={{ textAlign: 'center' }}>Sent</TableHead>
                                    <TableHead style={{ textAlign: 'center' }}>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {vm.queueItems.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            {item.template_name || '-'}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className="tw:block tw:max-w-[180px] tw:truncate tw:text-sm"
                                                title={item.to_emails.join(', ')}
                                            >
                                                {item.to_emails.length > 0
                                                    ? `${item.to_emails[0]}${item.to_emails.length > 1 ? ` +${item.to_emails.length - 1}` : ''}`
                                                    : '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className="tw:block tw:max-w-[240px] tw:truncate tw:text-sm"
                                                title={item.subject}
                                            >
                                                {truncate(item.subject, 40)}
                                            </span>
                                        </TableCell>
                                        <TableCell style={{ textAlign: 'center' }}>
                                            <Badge
                                                variant="outline"
                                                style={STATUS_BADGE_STYLE[item.status]}
                                            >
                                                {item.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell style={{ textAlign: 'center' }}>
                                            <span
                                                className="tw:text-sm"
                                                title={item.sent_at ? new Date(item.sent_at).toLocaleString() : ''}
                                            >
                                                {formatRelativeTime(item.sent_at)}
                                            </span>
                                        </TableCell>
                                        <TableCell style={{ textAlign: 'center' }}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon-xs">
                                                        <MoreHorizontal className="tw:size-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handlePreview(item)}>
                                                        <Eye className="tw:size-4" />
                                                        Preview Email
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => vm.handleViewDetail(item.id)}>
                                                        <FileText className="tw:size-4" />
                                                        View Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => vm.handleDuplicate(item.id)}>
                                                        <Copy className="tw:size-4" />
                                                        Duplicate
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => vm.openResendDialog(item.id)}>
                                                        <RotateCcw className="tw:size-4" />
                                                        Resend
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {previewItem && (
                        <div className="tw:mt-4 tw:rounded-md tw:border tw:border-admin-border tw:overflow-hidden">
                            <div className="tw:flex tw:items-center tw:justify-between tw:px-4 tw:py-2 tw:bg-admin-bg-muted tw:border-b tw:border-admin-border">
                                <span className="tw:text-sm tw:font-semibold">Email Preview</span>
                                <Button variant="ghost" size="icon-xs" onClick={() => setPreviewItem(null)}>
                                    <X className="tw:size-4" />
                                </Button>
                            </div>
                            {previewItem.html_content ? (
                                <iframe
                                    srcDoc={previewItem.html_content}
                                    title="Email HTML Preview"
                                    style={{ width: '100%', minHeight: 400, border: 'none' }}
                                    sandbox="allow-same-origin"
                                />
                            ) : (
                                <div className="tw:p-4 tw:text-sm tw:text-admin-fg-muted">No HTML content available.</div>
                            )}
                        </div>
                    )}

                    {/* Pagination */}
                    <div className="tw:flex tw:items-center tw:justify-between tw:px-2 tw:py-4 tw:text-sm tw:text-admin-fg-muted">
                        <span>
                            Showing {vm.page * vm.rowsPerPage + 1}&ndash;{Math.min((vm.page + 1) * vm.rowsPerPage, vm.totalCount)} of {vm.totalCount}
                        </span>
                        <div className="tw:flex tw:items-center tw:gap-4">
                            <div className="tw:flex tw:items-center tw:gap-2">
                                <span>Rows per page</span>
                                <select
                                    className="tw:h-8 tw:rounded-md tw:border tw:border-admin-border tw:bg-transparent tw:px-2 tw:text-sm"
                                    value={vm.rowsPerPage}
                                    onChange={(e) => vm.handleChangeRowsPerPage(e as any)}
                                >
                                    {[10, 25, 50, 100].map((size) => (
                                        <option key={size} value={size}>{size}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="tw:flex tw:items-center tw:gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={vm.page === 0}
                                    onClick={(e) => vm.handleChangePage(e, vm.page - 1)}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={(vm.page + 1) * vm.rowsPerPage >= vm.totalCount}
                                    onClick={(e) => vm.handleChangePage(e, vm.page + 1)}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Resend Confirmation Dialog */}
            <AdminConfirmDialog
                open={vm.resendDialogOpen}
                title="Confirm Resend"
                description="Are you sure you want to resend this email? This will reset the queue item status and attempt to send it again."
                confirmLabel="Resend"
                onConfirm={vm.confirmResend}
                onCancel={vm.closeResendDialog}
            />
        </AdminPage>
    );
};

export default EmailQueueList;
