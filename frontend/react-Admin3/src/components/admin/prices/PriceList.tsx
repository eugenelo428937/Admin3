import React from 'react';
import {
  Container, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Alert, Paper, Typography, Box, CircularProgress, TablePagination,
  IconButton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Link, Navigate } from 'react-router-dom';
import usePriceListVM from './usePriceListVM';

const AdminPriceList: React.FC = () => {
    const vm = usePriceListVM();

    if (!vm.isSuperuser) return <Navigate to="/" replace />;
    if (vm.loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

    return (
        <Container sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" component="h2">Prices</Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                        {vm.groupedProducts.length} product{vm.groupedProducts.length !== 1 ? 's' : ''}, {vm.totalCount} price{vm.totalCount !== 1 ? 's' : ''} total
                    </Typography>
                    <Button component={Link} to="/admin/prices/new" variant="contained">
                        Add New Price
                    </Button>
                </Box>
            </Box>

            {vm.error && <Alert severity="error" sx={{ mb: 3 }}>{vm.error}</Alert>}

            {vm.prices.length === 0 && !vm.error ? (
                <Alert severity="info">No prices found.</Alert>
            ) : (
                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Product Code</TableCell>
                                <TableCell align="right">Standard</TableCell>
                                <TableCell align="right">Retaker</TableCell>
                                <TableCell align="right">Additional</TableCell>
                                <TableCell align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {vm.groupedProducts.map((row) => (
                                <TableRow key={row.product_id} hover>
                                    <TableCell>{row.product_id}</TableCell>
                                    <TableCell>{row.product_code}</TableCell>
                                    <TableCell align="right">
                                        {row.prices.standard != null ? `\u00A3${row.prices.standard}` : '\u2014'}
                                    </TableCell>
                                    <TableCell align="right">
                                        {row.prices.retaker != null ? `\u00A3${row.prices.retaker}` : '\u2014'}
                                    </TableCell>
                                    <TableCell align="right">
                                        {row.prices.additional != null ? `\u00A3${row.prices.additional}` : '\u2014'}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                            <IconButton
                                                component={Link}
                                                to={`/admin/prices/${row.price_ids[0]}/edit`}
                                                size="small"
                                                color="info"
                                                aria-label={`Edit prices for ${row.product_code}`}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => vm.handleDeleteProduct(row.price_ids)}
                                                aria-label={`Delete prices for ${row.product_code}`}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
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
                    rowsPerPageOptions={[100, 200, 500]}
                />
            )}
        </Container>
    );
};

export default AdminPriceList;
