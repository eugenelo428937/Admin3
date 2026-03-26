import React, { useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import {
    AdminPage,
    AdminPageHeader,
    AdminErrorAlert,
    AdminLoadingState,
    AdminConfirmDialog,
    AdminToggleGroup,
} from '@/components/admin/composed';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/admin/ui/table';
import { Button } from '@/components/admin/ui/button';
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

const getRetryIconColor = (batch: { status: BatchStatus; error_count: number }): string => {
    if (batch.status === 'failed') return '#dc2626';
    if (batch.error_count > 0) return '#d97706';
    return '#64748b';
};

const EmailBatchList: React.FC = () => {
    const vm = useEmailBatchListVM();

    useEffect(() => {
        vm.fetchBatches();
    }, [vm.fetchBatches]);

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
                className="tw:mb-4"
            />

            <AdminErrorAlert message={vm.error} />

            {vm.loading ? (
                <AdminLoadingState rows={5} columns={5} />
            ) : vm.batches.length === 0 && !vm.error ? (
                <div role="alert" className="tw:rounded-md tw:border tw:border-blue-200 tw:bg-blue-50 tw:p-4 tw:text-sm tw:text-blue-800">
                    No batches found.
                </div>
            ) : (
                <>
                    <div className="tw:rounded-md tw:border tw:border-admin-border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Template</TableHead>
                                    <TableHead style={{ textAlign: 'center' }}>Progress</TableHead>
                                    <TableHead style={{ textAlign: 'center' }}>Created</TableHead>
                                    <TableHead style={{ textAlign: 'center' }}>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {vm.batches.map((batch) => {
                                    const progressStatus = getProgressStatusLabel(batch);
                                    const hasErrors = batch.error_count > 0;
                                    const retryColor = getRetryIconColor(batch);

                                    return (
                                        <TableRow
                                            key={batch.batch_id}
                                            className={`tw:cursor-pointer ${vm.selectedBatchId === batch.batch_id ? 'tw:bg-blue-50' : ''}`}
                                            onClick={() => vm.handleSelectBatch(batch.batch_id)}
                                        >
                                            <TableCell>{batch.template_name || '-'}</TableCell>
                                            <TableCell style={{ textAlign: 'center' }}>
                                                <div>
                                                    <span className="tw:font-semibold">
                                                        {batch.sent_count}/{batch.total_items}
                                                    </span>
                                                </div>
                                                <div style={{ color: progressStatus.color }}>
                                                    {progressStatus.text}
                                                </div>
                                            </TableCell>
                                            <TableCell style={{ textAlign: 'center' }}>
                                                <div>{batch.requested_by}</div>
                                                <div className="tw:text-admin-fg-muted tw:text-xs">
                                                    <span title={batch.created_at ? new Date(batch.created_at).toLocaleString() : ''}>
                                                        {formatRelativeTime(batch.created_at)}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell style={{ textAlign: 'center' }}>
                                                <button
                                                    title="Resend failed emails"
                                                    disabled={!hasErrors}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        vm.openRetryDialog(batch.batch_id);
                                                    }}
                                                    className="tw:inline-flex tw:items-center tw:justify-center tw:rounded-md tw:p-1.5 tw:transition-colors hover:tw:bg-gray-100"
                                                    style={{ opacity: hasErrors ? 1 : 0.4, cursor: hasErrors ? 'pointer' : 'default' }}
                                                >
                                                    <RotateCcw size={16} style={{ color: retryColor }} />
                                                </button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

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
