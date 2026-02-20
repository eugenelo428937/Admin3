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
import useClosingSalutationListVM from './useClosingSalutationListVM';
import type { SignatureType } from '../../../../types/email';

const SIGNATURE_TYPE_COLOR: Record<SignatureType, 'info' | 'secondary'> = {
    team: 'info',
    staff: 'secondary',
};

const ClosingSalutationList: React.FC = () => {
    const navigate = useNavigate();
    const vm = useClosingSalutationListVM();

    useEffect(() => {
        vm.fetchSalutations();
    }, [vm.page, vm.rowsPerPage]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <Container maxWidth="lg" sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">Closing Salutations</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/admin/email/closing-salutations/new')}
                >
                    Add Salutation
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
                                    <TableCell>Sign-off</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Active</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {vm.salutations.map(salutation => (
                                    <TableRow key={salutation.id}>
                                        <TableCell>
                                            <Typography variant="body2" fontFamily="monospace">
                                                {salutation.name}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{salutation.display_name}</TableCell>
                                        <TableCell>{salutation.sign_off_text}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={salutation.signature_type}
                                                color={SIGNATURE_TYPE_COLOR[salutation.signature_type] || 'default'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={salutation.is_active ? 'Active' : 'Inactive'}
                                                color={salutation.is_active ? 'success' : 'default'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => vm.handleEdit(salutation.id)}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => vm.handleDelete(salutation.id)}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {vm.salutations.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center">
                                            <Typography color="text.secondary" sx={{ py: 2 }}>
                                                No closing salutations found
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

export default ClosingSalutationList;
