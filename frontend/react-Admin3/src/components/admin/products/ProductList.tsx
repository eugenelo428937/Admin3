import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
    Button, Container, Grid, Typography, Alert, Box, CircularProgress,
    TablePagination,
} from '@mui/material';
import ProductTable from './ProductTable.tsx';
import useProductListVM from './useProductListVM';

const AdminProductList: React.FC = () => {
    const vm = useProductListVM();

    if (!vm.isSuperuser) return <Navigate to="/" replace />;
    if (vm.loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;
    if (vm.error) return <Alert severity="error" sx={{ mt: 4 }}>{vm.error}</Alert>;

    return (
        <Container sx={{ mt: 4 }}>
            <Grid container sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="h4" component="h2">Products</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                        <Button component={Link} to="/admin/products/new" variant="contained">
                            Add New Product
                        </Button>
                        <Button component={Link} to="/admin/products/import" variant="outlined">
                            Import Products
                        </Button>
                    </Box>
                </Grid>
            </Grid>

            {vm.products.length === 0 ? (
                <Alert severity="info">No products found</Alert>
            ) : (
                <>
                    <ProductTable
                        products={vm.products}
                        onDelete={vm.handleDelete}
                    />
                    {vm.totalCount > vm.rowsPerPage && (
                        <TablePagination
                            component="div"
                            count={vm.totalCount}
                            page={vm.page}
                            onPageChange={vm.handleChangePage}
                            rowsPerPage={vm.rowsPerPage}
                            onRowsPerPageChange={vm.handleChangeRowsPerPage}
                            rowsPerPageOptions={[25, 50, 100]}
                        />
                    )}
                </>
            )}
        </Container>
    );
};

export default AdminProductList;
