import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container, Typography, Box, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Chip, CircularProgress, Alert, IconButton,
    Button, TablePagination,
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
} from '@mui/icons-material';
import useEmailAttachmentListVM from './useEmailAttachmentListVM';
import type { AttachmentType } from '../../../../types/email';

const ATTACHMENT_TYPE_COLOR: Record<AttachmentType, 'primary' | 'secondary' | 'info' | 'warning'> = {
    static: 'primary',
    dynamic: 'secondary',
    template: 'info',
    external: 'warning',
};

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const EmailAttachmentList: React.FC = () => {
    const navigate = useNavigate();
    const vm = useEmailAttachmentListVM();

    useEffect(() => {
        vm.fetchAttachments();
    }, [vm.page, vm.rowsPerPage]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <Container maxWidth="lg" sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">Email Attachments</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/admin/email/attachments/new')}
                >
                    Add Attachment
                </Button>
            </Box>

            {vm.error && <Alert severity="error" sx={{ mb: 2 }}>{vm.error}</Alert>}

            {vm.loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Paper>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Display Name</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Size</TableCell>
                                    <TableCell>Active</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {vm.attachments.map(attachment => (
                                    <TableRow key={attachment.id}>
                                        <TableCell>
                                            <Typography variant="body2" fontFamily="monospace">
                                                {attachment.name}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{attachment.display_name}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={attachment.attachment_type}
                                                color={ATTACHMENT_TYPE_COLOR[attachment.attachment_type] || 'default'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>{formatFileSize(attachment.file_size)}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={attachment.is_active ? 'Active' : 'Inactive'}
                                                color={attachment.is_active ? 'success' : 'default'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => vm.handleEdit(attachment.id)}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => vm.handleDelete(attachment.id)}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {vm.attachments.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center">
                                            <Typography color="text.secondary" sx={{ py: 2 }}>
                                                No attachments found
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
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
                        rowsPerPageOptions={[10, 25, 50]}
                    />
                </Paper>
            )}
        </Container>
    );
};

export default EmailAttachmentList;
