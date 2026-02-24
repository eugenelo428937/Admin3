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
import useEmailPlaceholderListVM from './useEmailPlaceholderListVM';
import type { InsertPosition } from '../../../../types/email';

const INSERT_POSITION_COLOR: Record<InsertPosition, 'primary' | 'secondary' | 'info' | 'warning' | 'success'> = {
    replace: 'primary',
    before: 'secondary',
    after: 'info',
    append: 'warning',
    prepend: 'success',
};

const EmailPlaceholderList: React.FC = () => {
    const navigate = useNavigate();
    const vm = useEmailPlaceholderListVM();

    useEffect(() => {
        vm.fetchPlaceholders();
    }, [vm.page, vm.rowsPerPage]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <Container maxWidth="lg" sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">Email Placeholders</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/admin/email/placeholders/new')}
                >
                    Add Placeholder
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
                                    <TableCell>Insert Position</TableCell>
                                    <TableCell>Required</TableCell>
                                    <TableCell>Active</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {vm.placeholders.map(placeholder => (
                                    <TableRow key={placeholder.id}>
                                        <TableCell>
                                            <Typography variant="body2" fontFamily="monospace">
                                                {placeholder.name}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{placeholder.display_name}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={placeholder.insert_position}
                                                color={INSERT_POSITION_COLOR[placeholder.insert_position] || 'default'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={placeholder.is_required ? 'Yes' : 'No'}
                                                color={placeholder.is_required ? 'warning' : 'default'}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={placeholder.is_active ? 'Active' : 'Inactive'}
                                                color={placeholder.is_active ? 'success' : 'default'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => vm.handleEdit(placeholder.id)}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => vm.handleDelete(placeholder.id)}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {vm.placeholders.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center">
                                            <Typography color="text.secondary" sx={{ py: 2 }}>
                                                No placeholders found
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

export default EmailPlaceholderList;
