// src/components/admin/store-products/StoreProductList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Container, Alert, Paper, Typography, Box, CircularProgress, TablePagination
} from '@mui/material';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import storeProductService from '../../../services/storeProductService';

const AdminStoreProductList = () => {
    const { isSuperuser } = useAuth();
    const [storeProducts, setStoreProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [totalCount, setTotalCount] = useState(0);

    const fetchStoreProducts = useCallback(async () => {
        try {
            setLoading(true);
            const { results, count } = await storeProductService.list({
                page: page + 1,
                page_size: rowsPerPage,
            });
            setStoreProducts(results);
            setTotalCount(count);
            setError(null);
        } catch (err) {
            console.error('Error fetching store products:', err);
            setError('Failed to fetch store products. Please try again later.');
            setStoreProducts([]);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage]);

    useEffect(() => {
        fetchStoreProducts();
    }, [fetchStoreProducts]);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this store product?')) {
            try {
                await storeProductService.delete(id);
                fetchStoreProducts();
            } catch (err) {
                setError('Failed to delete store product. Please try again later.');
            }
        }
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    if (!isSuperuser) return <Navigate to="/" replace />;
    if (loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

    return (
        <Container sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" component="h2">Store Products</Typography>
                <Button component={Link} to="/admin/store-products/new" variant="contained">
                    Add New Store Product
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {storeProducts.length === 0 && !error ? (
                <Alert severity="info">No store products found.</Alert>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Product Code</TableCell>
                                <TableCell>Subject</TableCell>
                                <TableCell>Session</TableCell>
                                <TableCell>Variation Type</TableCell>
                                <TableCell>Product Name</TableCell>
                                <TableCell>Is Active</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {storeProducts.map((product) => (
                                <TableRow key={product.id} hover>
                                    <TableCell>{product.id}</TableCell>
                                    <TableCell>{product.product_code}</TableCell>
                                    <TableCell>{product.subject_code || product.exam_session_subject?.subject_code || ''}</TableCell>
                                    <TableCell>{product.session_code || product.exam_session_subject?.session_code || ''}</TableCell>
                                    <TableCell>{product.variation_type || ''}</TableCell>
                                    <TableCell>{product.product_name || ''}</TableCell>
                                    <TableCell>{product.is_active ? 'Active' : 'Inactive'}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Button
                                                component={Link}
                                                to={`/admin/store-products/${product.id}/edit`}
                                                variant="contained"
                                                color="info"
                                                size="small"
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                variant="contained"
                                                color="error"
                                                size="small"
                                                onClick={() => handleDelete(product.id)}
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

            {totalCount > rowsPerPage && (
                <TablePagination
                    component="div"
                    count={totalCount}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[25, 50, 100]}
                />
            )}
        </Container>
    );
};

export default AdminStoreProductList;
