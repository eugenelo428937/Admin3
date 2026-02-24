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
import useEmailContentRuleListVM from './useEmailContentRuleListVM';
import type { RuleType } from '../../../../types/email';

const RULE_TYPE_COLOR: Record<RuleType, 'primary' | 'secondary' | 'info' | 'warning' | 'success' | 'error'> = {
    product_based: 'primary',
    user_attribute: 'secondary',
    order_value: 'info',
    location_based: 'warning',
    date_based: 'success',
    custom_condition: 'error',
};

const RULE_TYPE_LABEL: Record<RuleType, string> = {
    product_based: 'Product Based',
    user_attribute: 'User Attribute',
    order_value: 'Order Value',
    location_based: 'Location Based',
    date_based: 'Date Based',
    custom_condition: 'Custom',
};

const EmailContentRuleList: React.FC = () => {
    const navigate = useNavigate();
    const vm = useEmailContentRuleListVM();

    useEffect(() => {
        vm.fetchRules();
    }, [vm.page, vm.rowsPerPage]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <Container maxWidth="lg" sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">Email Content Rules</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/admin/email/content-rules/new')}
                >
                    Add Content Rule
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
                                    <TableCell>Rule Type</TableCell>
                                    <TableCell>Placeholder</TableCell>
                                    <TableCell>Priority</TableCell>
                                    <TableCell>Exclusive</TableCell>
                                    <TableCell>Active</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {vm.rules.map(rule => (
                                    <TableRow key={rule.id}>
                                        <TableCell>
                                            <Typography variant="body2">{rule.name}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={RULE_TYPE_LABEL[rule.rule_type] || rule.rule_type}
                                                color={RULE_TYPE_COLOR[rule.rule_type] || 'default'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontFamily="monospace">
                                                {rule.placeholder_name || `#${rule.placeholder}`}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{rule.priority}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={rule.is_exclusive ? 'Yes' : 'No'}
                                                color={rule.is_exclusive ? 'warning' : 'default'}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={rule.is_active ? 'Active' : 'Inactive'}
                                                color={rule.is_active ? 'success' : 'default'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => vm.handleEdit(rule.id)}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => vm.handleDelete(rule.id)}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {vm.rules.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">
                                            <Typography color="text.secondary" sx={{ py: 2 }}>
                                                No content rules found
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

export default EmailContentRuleList;
