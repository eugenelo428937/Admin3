import React, { useEffect } from 'react';
import { Eye, Copy, RotateCcw, FileText, Pencil } from 'lucide-react';
import {
    AdminPage,
    AdminPageHeader,
    AdminErrorAlert,
    AdminDataTable,
    AdminConfirmDialog,
    AdminToggleGroup,
} from '@/components/admin/composed';
import type { SimpleColumn } from '@/components/admin/composed';
import { Badge } from '@/components/admin/ui/badge';
import { useEmailQueueListVM } from './useEmailQueueListVM';
import type { QueueStatus, EmailQueue } from '../../../../types/email';
import emailService from '../../../../services/emailService';
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

    const handleViewEmail = async (item: EmailQueue) => {
        try {
            const html = await emailService.viewQueueItemEmail(item.id);
            if (!html) return;
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const viewWindow = window.open(url, '_blank');
            if (viewWindow) {
                viewWindow.addEventListener('unload', () => URL.revokeObjectURL(url));
            }
        } catch {
            // Silently fail — user can retry
        }
    };

    useEffect(() => {
        vm.fetchQueue();
    }, [vm.fetchQueue]);

    const columns: SimpleColumn<any>[] = [
        {
            key: 'template_name',
            header: 'Template',
            render: (value: string) => value || '-',
        },
        {
            key: 'to_emails',
            header: 'To',
            render: (value: string[]) => (
                <span
                    className="tw:block tw:max-w-[180px] tw:truncate"
                    title={value.join(', ')}
                >
                    {value.length > 0
                        ? `${value[0]}${value.length > 1 ? ` +${value.length - 1}` : ''}`
                        : '-'}
                </span>
            ),
        },
        {
            key: 'subject',
            header: 'Subject',
            render: (value: string, row: any) => (
                <div className="tw:flex tw:items-center tw:gap-1.5">
                    <span
                        className="tw:block tw:max-w-[240px] tw:truncate"
                        title={value}
                    >
                        {truncate(value, 40)}
                    </span>
                    {row.is_edited && (
                        <Badge variant="outline" className="tw:text-[10px] tw:px-1 tw:py-0 tw:border-blue-300 tw:bg-blue-50 tw:text-blue-700">
                            edited
                        </Badge>
                    )}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            align: 'center',
            render: (value: QueueStatus) => (
                <Badge variant="outline" style={STATUS_BADGE_STYLE[value]}>
                    {value}
                </Badge>
            ),
        },
        {
            key: 'sent_at',
            header: 'Sent',
            align: 'center',
            render: (value: string | null) => (
                <span
                    title={value ? new Date(value).toLocaleString() : ''}
                >
                    {formatRelativeTime(value)}
                </span>
            ),
        },
    ];

    return (
        <AdminPage>
            <AdminPageHeader title="Email Queue" />

            <AdminToggleGroup
                options={STATUS_OPTIONS.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
                value={vm.statusFilter}
                onChange={vm.handleStatusFilter}
                
            />

            <div className="tw:mb-4 tw:max-w-sm">
                <EmailToFilter
                    value={vm.toFilter}
                    onChange={vm.handleToFilter}
                    placeholder="Filter by recipient email..."
                />
            </div>

            <AdminErrorAlert message={vm.error} />

            <AdminDataTable
                columns={columns}
                data={vm.queueItems}
                loading={vm.loading}
                emptyMessage="No queue items found."
                actions={(row: EmailQueue) => [
                    {
                        label: 'View Email',
                        icon: Eye,
                        disabled: !row.can_view_email,
                        onClick: () => handleViewEmail(row),
                    },
                    {
                        label: 'View Details',
                        icon: FileText,
                        onClick: () => vm.handleViewDetail(row.id),
                    },
                    {
                        label: 'Edit',
                        icon: Pencil,
                        disabled: row.status !== 'pending' && row.status !== 'retry',
                        onClick: () => vm.handleEdit(row.id),
                    },
                    {
                        label: 'Duplicate',
                        icon: Copy,
                        onClick: () => vm.handleDuplicate(row.id),
                    },
                    {
                        label: 'Resend',
                        icon: RotateCcw,
                        onClick: () => vm.openResendDialog(row.id),
                    },
                ]}
                pagination={vm.totalCount > vm.rowsPerPage ? {
                    page: vm.page,
                    pageSize: vm.rowsPerPage,
                    total: vm.totalCount,
                    onPageChange: vm.handleChangePage,
                    onPageSizeChange: vm.handleChangeRowsPerPage as any,
                    pageSizeOptions: [10, 25, 50, 100],
                } : undefined}
            />

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
