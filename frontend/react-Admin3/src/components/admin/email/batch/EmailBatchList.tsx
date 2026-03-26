import React, { useEffect } from 'react';
import {
    AdminPage,
    AdminPageHeader,
    AdminErrorAlert,
    AdminLoadingState,
    AdminToggleGroup,
} from '@/components/admin/composed';
import { Badge } from '@/components/admin/ui/badge';
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
                <AdminLoadingState rows={5} columns={7} />
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
                                    <TableHead>Batch ID</TableHead>
                                    <TableHead>Template</TableHead>
                                    <TableHead>Requested By</TableHead>
                                    <TableHead className="tw:text-center">Sent</TableHead>
                                    <TableHead className="tw:text-center">Errors</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {vm.batches.map((batch) => (
                                    <TableRow
                                        key={batch.batch_id}
                                        className={`tw:cursor-pointer ${vm.selectedBatchId === batch.batch_id ? 'tw:bg-blue-50' : ''}`}
                                        onClick={() => vm.handleSelectBatch(batch.batch_id)}
                                    >
                                        <TableCell>
                                            <span className="tw:font-mono tw:text-xs" title={batch.batch_id}>
                                                {batch.batch_id.substring(0, 8)}
                                            </span>
                                        </TableCell>
                                        <TableCell>{batch.template_name || '-'}</TableCell>
                                        <TableCell>{batch.requested_by}</TableCell>
                                        <TableCell className="tw:text-center">
                                            {batch.sent_count}/{batch.total_items}
                                        </TableCell>
                                        <TableCell className="tw:text-center">
                                            {batch.error_count}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={STATUS_BADGE_CLASS[batch.status]}>
                                                {STATUS_LABEL[batch.status]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="tw:text-sm" title={batch.created_at ? new Date(batch.created_at).toLocaleString() : ''}>
                                                {formatRelativeTime(batch.created_at)}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
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
        </AdminPage>
    );
};

export default EmailBatchList;
