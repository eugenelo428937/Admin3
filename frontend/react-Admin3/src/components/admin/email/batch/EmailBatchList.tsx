import React, { useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import {
    AdminPage,
    AdminPageHeader,
    AdminErrorAlert,
    AdminDataTable,
    AdminConfirmDialog,
    AdminToggleGroup,
} from '@/components/admin/composed';
import type { SimpleColumn } from '@/components/admin/composed';
import { useEmailBatchListVM } from './useEmailBatchListVM';
import EmailBatchDrawer from './EmailBatchDrawer';
import type { BatchStatus } from '../../../../types/email';

const STATUS_OPTIONS: Array<BatchStatus | 'all'> = [
    'all',
    'pending',
    'processing',
    'completed',
    'completed_with_errors',
    'failed',
];

const STATUS_OPTION_LABELS: Record<string, string> = {
    all: 'All',
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    completed_with_errors: 'With Errors',
    failed: 'Failed',
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

const getProgressStatusLabel = (batch: { status: BatchStatus; error_count: number }): { text: string; color: string } => {
    if (batch.error_count > 0) return { text: `(${batch.error_count} failed)`, color: '#d97706' };
    if (batch.status === 'completed') return { text: '(Completed)', color: '#16a34a' };
    if (batch.status === 'failed') return { text: '(Failed)', color: '#dc2626' };
    if (batch.status === 'processing') return { text: '(Processing)', color: '#1d4ed8' };
    if (batch.status === 'pending') return { text: '(Queued)', color: '#64748b' };
    return { text: '', color: '#64748b' };
};

const EmailBatchList: React.FC = () => {
    const vm = useEmailBatchListVM();

    useEffect(() => {
        vm.fetchBatches();
    }, [vm.fetchBatches]);

    const columns: SimpleColumn<any>[] = [
        {
            key: 'template_name',
            header: 'Template',
            render: (value: string) => value || '-',
        },
        {
            key: 'sent_count',
            header: 'Progress',
            align: 'center',
            render: (_value: number, row: any) => {
                const progressStatus = getProgressStatusLabel(row);
                return (
                    <div>
                        <div>
                            <span className="tw:font-semibold">
                                {row.sent_count}/{row.total_items}
                            </span>
                        </div>
                        <div style={{ color: progressStatus.color }}>
                            {progressStatus.text}
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'created_at',
            header: 'Created',
            align: 'center',
            render: (value: string | null, row: any) => (
                <div>
                    <div>{row.requested_by}</div>
                    <div className="tw:text-admin-fg-muted tw:text-xs">
                        <span title={value ? new Date(value).toLocaleString() : ''}>
                            {formatRelativeTime(value)}
                        </span>
                    </div>
                </div>
            ),
        },
    ];

    return (
        <AdminPage>
            <AdminPageHeader title="Email Batches" />

            <AdminToggleGroup
                options={STATUS_OPTIONS.map(s => ({
                    value: s,
                    label: STATUS_OPTION_LABELS[s] || s,
                }))}
                value={vm.statusFilter}
                onChange={vm.handleStatusFilter}
                
            />

            <AdminErrorAlert message={vm.error} />

            <AdminDataTable
                columns={columns}
                data={vm.batches}
                loading={vm.loading}
                emptyMessage="No batches found."
                onRowClick={(row: any) => vm.handleSelectBatch(row.batch_id)}
                actions={(row: any) => [
                    {
                        label: 'Resend failed emails',
                        icon: RotateCcw,
                        disabled: row.error_count === 0,
                        onClick: () => vm.openRetryDialog(row.batch_id),
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

            {/* Batch Detail Drawer */}
            <EmailBatchDrawer
                batchId={vm.selectedBatchId}
                onClose={vm.handleCloseDrawer}
            />

            {/* Retry Confirmation Dialog */}
            <AdminConfirmDialog
                open={vm.retryDialogOpen}
                title="Confirm Retry"
                description="Are you sure you want to resend all failed emails in this batch? This will re-queue the failed items and attempt to send them again."
                confirmLabel="Resend"
                onConfirm={vm.confirmRetry}
                onCancel={vm.closeRetryDialog}
            />
        </AdminPage>
    );
};

export default EmailBatchList;
