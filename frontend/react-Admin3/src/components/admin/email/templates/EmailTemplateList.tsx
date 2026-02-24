import React from 'react';
import { Link } from 'react-router-dom';
import {
    Container,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Alert,
    Paper,
    Typography,
    Box,
    CircularProgress,
    TablePagination,
    Chip,
} from '@mui/material';
import useEmailTemplateListVM from './useEmailTemplateListVM';
import type { TemplateType } from '../../../../types/email';
import type { MasterFilter } from './useEmailTemplateListVM';

const TEMPLATE_TYPE_OPTIONS: { value: TemplateType | 'all'; label: string }[] = [
    { value: 'all', label: 'All Types' },
    { value: 'order_confirmation', label: 'Order Confirmation' },
    { value: 'password_reset', label: 'Password Reset' },
    { value: 'password_reset_completed', label: 'Password Reset Completed' },
    { value: 'account_activation', label: 'Account Activation' },
    { value: 'newsletter', label: 'Newsletter' },
    { value: 'welcome', label: 'Welcome' },
    { value: 'reminder', label: 'Reminder' },
    { value: 'notification', label: 'Notification' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'support', label: 'Support' },
    { value: 'custom', label: 'Custom' },
];

const MASTER_FILTER_OPTIONS: { value: MasterFilter; label: string }[] = [
    { value: 'general', label: 'General Templates' },
    { value: 'master', label: 'Master Templates' },
];

const EmailTemplateList: React.FC = () => {
    const vm = useEmailTemplateListVM();

    if (vm.loading) {
        return (
            <Box sx={{ textAlign: 'center', mt: 5 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" component="h2">
                    Email Templates
                </Typography>
                <Button
                    component={Link}
                    to="/admin/email/templates/new"
                    variant="contained"
                >
                    Add Template
                </Button>
            </Box>

            {vm.error && <Alert severity="error" sx={{ mb: 2 }}>{vm.error}</Alert>}

            {/* Master filter */}
            <Box sx={{ mb: 1, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>Master:</Typography>
                {MASTER_FILTER_OPTIONS.map(opt => (
                    <Chip
                        key={opt.value}
                        label={opt.label}
                        color={vm.filterMaster === opt.value ? 'primary' : 'default'}
                        onClick={() => vm.setFilterMaster(opt.value)}
                        variant={vm.filterMaster === opt.value ? 'filled' : 'outlined'}
                        size="small"
                    />
                ))}
            </Box>

            {/* Template type filter */}
            <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>Type:</Typography>
                {TEMPLATE_TYPE_OPTIONS.map(opt => (
                    <Chip
                        key={opt.value}
                        label={opt.label}
                        color={vm.filterTemplateType === opt.value ? 'primary' : 'default'}
                        onClick={() => vm.setFilterTemplateType(opt.value)}
                        variant={vm.filterTemplateType === opt.value ? 'filled' : 'outlined'}
                        size="small"
                    />
                ))}
            </Box>

            {vm.templates.length === 0 && !vm.error ? (
                <Alert severity="info">No email templates found.</Alert>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Display Name</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Subject</TableCell>
                                <TableCell>Priority</TableCell>
                                <TableCell>Master</TableCell>
                                <TableCell>Active</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {vm.templates.map((template) => (
                                <TableRow key={template.id} hover>
                                    <TableCell>{template.name}</TableCell>
                                    <TableCell>{template.display_name}</TableCell>
                                    <TableCell>{template.template_type}</TableCell>
                                    <TableCell>{template.subject_template}</TableCell>
                                    <TableCell>{template.default_priority}</TableCell>
                                    <TableCell>
                                        {template.is_master && (
                                            <Chip label="Master" color="info" size="small" />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={template.is_active ? 'Active' : 'Inactive'}
                                            color={template.is_active ? 'success' : 'default'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Button
                                                variant="contained"
                                                color="warning"
                                                size="small"
                                                onClick={() => vm.handleEdit(template.id)}
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                variant="contained"
                                                color="error"
                                                size="small"
                                                onClick={() => vm.handleDelete(template.id)}
                                            >
                                                Delete
                                            </Button>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {vm.totalCount > vm.rowsPerPage && (
                <TablePagination
                    component="div"
                    count={vm.totalCount}
                    page={vm.page}
                    onPageChange={vm.handleChangePage}
                    rowsPerPage={vm.rowsPerPage}
                    onRowsPerPageChange={vm.handleChangeRowsPerPage}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                />
            )}
        </Container>
    );
};

export default EmailTemplateList;
