// src/components/admin/prices/PriceList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Container, Alert, Paper, Typography, Box, CircularProgress, TablePagination
} from '@mui/material';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import priceService from '../../../services/priceService';

const AdminPriceList = () => {
    const { isSuperuser } = useAuth();
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [totalCount, setTotalCount] = useState(0);

    const fetchPrices = useCallback(async () => {
        try {
            setLoading(true);
            const { results, count } = await priceService.list({
                page: page + 1,
                page_size: rowsPerPage,
            });
            setPrices(results);
            setTotalCount(count);
            setError(null);
        } catch (err) {
            console.error('Error fetching prices:', err);
            setError('Failed to fetch prices. Please try again later.');
            setPrices([]);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage]);

    useEffect(() => {
        fetchPrices();
    }, [fetchPrices]);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this price?')) {
            try {
                await priceService.delete(id);
                fetchPrices();
            } catch (err) {
                setError('Failed to delete price. Please try again later.');
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
                <Typography variant="h4" component="h2">Prices</Typography>
                <Button component={Link} to="/admin/prices/new" variant="contained">
                    Add New Price
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {prices.length === 0 && !error ? (
                <Alert severity="info">No prices found.</Alert>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Product Code</TableCell>
                                <TableCell>Price Type</TableCell>
                                <TableCell>Amount</TableCell>
                                <TableCell>Currency</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {prices.map((price) => (
                                <TableRow key={price.id} hover>
                                    <TableCell>{price.id}</TableCell>
                                    <TableCell>{price.product_code || price.product?.product_code || ''}</TableCell>
                                    <TableCell>{price.price_type || ''}</TableCell>
                                    <TableCell>{price.amount}</TableCell>
                                    <TableCell>{price.currency || ''}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Button
                                                component={Link}
                                                to={`/admin/prices/${price.id}/edit`}
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
                                                onClick={() => handleDelete(price.id)}
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

export default AdminPriceList;
