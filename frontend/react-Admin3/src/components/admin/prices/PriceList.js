// src/components/admin/prices/PriceList.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Container, Alert, Paper, Typography, Box, CircularProgress,
  TablePagination, IconButton, Button
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.js';
import priceService from '../../../services/priceService.js';

/**
 * Groups a flat array of prices into one row per product,
 * pivoting price_type values into columns.
 */
const groupPricesByProduct = (prices) => {
    const grouped = {};

    prices.forEach(price => {
        const productId = price.product;
        if (!grouped[productId]) {
            grouped[productId] = {
                product_id: productId,
                product_code: price.product_code || '',
                prices: {},
                price_ids: [],
            };
        }
        grouped[productId].prices[price.price_type] = price.amount;
        grouped[productId].price_ids.push(price.id);
    });

    return Object.values(grouped).sort((a, b) =>
        (a.product_code || '').localeCompare(b.product_code || '')
    );
};

const AdminPriceList = () => {
    const { isSuperuser } = useAuth();
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(500);
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

    const handleDeleteProduct = async (priceIds) => {
        const count = priceIds.length;
        if (window.confirm(`Delete ${count} price${count !== 1 ? 's' : ''} for this product?`)) {
            try {
                await Promise.all(priceIds.map(id => priceService.delete(id)));
                fetchPrices();
            } catch (err) {
                setError('Failed to delete prices. Please try again later.');
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

    const groupedProducts = useMemo(() => groupPricesByProduct(prices), [prices]);

    if (!isSuperuser) return <Navigate to="/" replace />;
    if (loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

    return (
        <Container sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" component="h2">Prices</Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                        {groupedProducts.length} product{groupedProducts.length !== 1 ? 's' : ''}, {totalCount} price{totalCount !== 1 ? 's' : ''} total
                    </Typography>
                    <Button component={Link} to="/admin/prices/new" variant="contained">
                        Add New Price
                    </Button>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {prices.length === 0 && !error ? (
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
                            {groupedProducts.map((row) => (
                                <TableRow key={row.product_id} hover>
                                    <TableCell>{row.product_id}</TableCell>
                                    <TableCell>{row.product_code}</TableCell>
                                    <TableCell align="right">
                                        {row.prices.standard != null ? `£${row.prices.standard}` : '—'}
                                    </TableCell>
                                    <TableCell align="right">
                                        {row.prices.retaker != null ? `£${row.prices.retaker}` : '—'}
                                    </TableCell>
                                    <TableCell align="right">
                                        {row.prices.additional != null ? `£${row.prices.additional}` : '—'}
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
                                                onClick={() => handleDeleteProduct(row.price_ids)}
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
            {totalCount > rowsPerPage && (
                <TablePagination
                    component="div"
                    count={totalCount}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[100, 200, 500]}
                />
            )}
        </Container>
    );
};

export default AdminPriceList;
