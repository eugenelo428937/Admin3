import React, { useEffect } from 'react';
import {
    Container,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    Box,
    CircularProgress,
    Alert,
    Chip,
    IconButton,
    Tooltip,
    TablePagination,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
} from '@mui/material';
import {
    Visibility as ViewIcon,
    ContentCopy as DuplicateIcon,
    Replay as ResendIcon,
} from '@mui/icons-material';
import { useEmailQueueListVM } from './useEmailQueueListVM';
import type { QueueStatus } from '../../../../types/email';

const STATUS_CHIP_COLOR: Record<QueueStatus, 'default' | 'info' | 'success' | 'error' | 'warning' | 'secondary'> = {
    pending: 'default',
    processing: 'info',
    sent: 'success',
    failed: 'error',
    cancelled: 'warning',
    retry: 'secondary',
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

    useEffect(() => {
        vm.fetchQueue();
    }, [vm.fetchQueue]);

    return (
        <Container sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h2">
                    Email Queue
                </Typography>
            </Box>

            {/* Status Filter Chips */}
            <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                {STATUS_OPTIONS.map((status) => (
                    <Chip
                        key={status}
                        label={status.charAt(0).toUpperCase() + status.slice(1)}
                        color={status === 'all' ? 'primary' : STATUS_CHIP_COLOR[status as QueueStatus]}
                        variant={vm.statusFilter === status ? 'filled' : 'outlined'}
                        onClick={() => vm.handleStatusFilter(status)}
                        clickable
                    />
                ))}
            </Box>

            {vm.error && <Alert severity="error" sx={{ mb: 3 }}>{vm.error}</Alert>}

            {vm.loading ? (
                <Box sx={{ textAlign: 'center', mt: 5 }}>
                    <CircularProgress />
                </Box>
            ) : vm.queueItems.length === 0 && !vm.error ? (
                <Alert severity="info">No queue items found.</Alert>
            ) : (
                <>
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Queue ID</TableCell>
                                    <TableCell>Template</TableCell>
                                    <TableCell>To</TableCell>
                                    <TableCell>Subject</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Sent</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {vm.queueItems.map((item) => (
                                    <TableRow key={item.id} hover>
                                        <TableCell>
                                            <Tooltip title={item.queue_id}>
                                                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                                                    {item.queue_id.substring(0, 8)}
                                                </Typography>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell>
                                            {item.template_name || '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Tooltip title={item.to_emails.join(', ')}>
                                                <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
                                                    {item.to_emails.length > 0
                                                        ? `${item.to_emails[0]}${item.to_emails.length > 1 ? ` +${item.to_emails.length - 1}` : ''}`
                                                        : '-'}
                                                </Typography>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell>
                                            <Tooltip title={item.subject}>
                                                <Typography variant="body2" noWrap sx={{ maxWidth: 240 }}>
                                                    {truncate(item.subject, 40)}
                                                </Typography>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={item.status}
                                                color={STATUS_CHIP_COLOR[item.status]}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Tooltip title={item.sent_at ? new Date(item.sent_at).toLocaleString() : ''}>
                                                <Typography variant="body2">
                                                    {formatRelativeTime(item.sent_at)}
                                                </Typography>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                                                <Tooltip title="View details">
                                                    <IconButton
                                                        size="small"
                                                        color="info"
                                                        onClick={() => vm.handleViewDetail(item.id)}
                                                    >
                                                        <ViewIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Duplicate">
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => vm.handleDuplicate(item.id)}
                                                    >
                                                        <DuplicateIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Resend">
                                                    <IconButton
                                                        size="small"
                                                        color="warning"
                                                        onClick={() => vm.openResendDialog(item.id)}
                                                    >
                                                        <ResendIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        component="div"
                        count={vm.totalCount}
                        page={vm.page}
                        onPageChange={vm.handleChangePage}
                        rowsPerPage={vm.rowsPerPage}
                        onRowsPerPageChange={vm.handleChangeRowsPerPage}
                        rowsPerPageOptions={[10, 25, 50, 100]}
                    />
                </>
            )}

            {/* Resend Confirmation Dialog */}
            <Dialog open={vm.resendDialogOpen} onClose={vm.closeResendDialog}>
                <DialogTitle>Confirm Resend</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to resend this email? This will reset the queue item
                        status and attempt to send it again.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={vm.closeResendDialog}>Cancel</Button>
                    <Button onClick={vm.confirmResend} variant="contained" color="warning">
                        Resend
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default EmailQueueList;
