// src/components/admin/product-bundles/ProductBundleList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Container, Alert, Paper, Typography, Box, CircularProgress, TablePagination,
  IconButton, Collapse
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.tsx';
import catalogBundleService from '../../../services/catalogBundleService';
import BundleProductsPanel from './BundleProductsPanel.js';

const AdminProductBundleList = () => {
    const { isSuperuser } = useAuth();
    const [bundles, setBundles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [totalCount, setTotalCount] = useState(0);
    const [expandedId, setExpandedId] = useState(null);

    const handleToggleExpand = (bundleId) => {
        setExpandedId(prev => prev === bundleId ? null : bundleId);
    };

    const fetchBundles = useCallback(async () => {
        try {
            setLoading(true);
            const { results, count } = await catalogBundleService.list({
                page: page + 1,
                page_size: rowsPerPage,
            });
            setBundles(results);
            setTotalCount(count);
            setError(null);
        } catch (err) {
            console.error('Error fetching product bundles:', err);
            setError('Failed to fetch product bundles. Please try again later.');
            setBundles([]);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage]);

    useEffect(() => {
        fetchBundles();
    }, [fetchBundles]);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this product bundle?')) {
            try {
                await catalogBundleService.delete(id);
                fetchBundles();
            } catch (err) {
                setError('Failed to delete product bundle. Please try again later.');
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
            <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
                Product Bundles
            </Typography>

            <Button
                component={Link}
                to="/admin/product-bundles/new"
                variant="contained"
                sx={{ mb: 3 }}
            >
                Create New Product Bundle
            </Button>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {bundles.length === 0 && !error ? (
                <Alert severity="info">No product bundles found.</Alert>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: 50 }} />
                                <TableCell>ID</TableCell>
                                <TableCell>Bundle Name</TableCell>
                                <TableCell>Subject</TableCell>
                                <TableCell>Is Featured</TableCell>
                                <TableCell>Is Active</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {Array.isArray(bundles) && bundles.map(bundle => (
                                <React.Fragment key={bundle.id}>
                                    <TableRow hover>
                                        <TableCell>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleToggleExpand(bundle.id)}
                                                aria-label={expandedId === bundle.id
                                                    ? `Collapse products for ${bundle.bundle_name}`
                                                    : `Expand products for ${bundle.bundle_name}`}
                                            >
                                                {expandedId === bundle.id
                                                    ? <KeyboardArrowUpIcon />
                                                    : <KeyboardArrowDownIcon />}
                                            </IconButton>
                                        </TableCell>
                                        <TableCell>{bundle.id}</TableCell>
                                        <TableCell>{bundle.bundle_name || '-'}</TableCell>
                                        <TableCell>{bundle.subject?.code || '-'}</TableCell>
                                        <TableCell>{bundle.is_featured ? 'Yes' : 'No'}</TableCell>
                                        <TableCell>{bundle.is_active ? 'Active' : 'Inactive'}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <Button
                                                    component={Link}
                                                    to={`/admin/product-bundles/${bundle.id}/edit`}
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
                                                    onClick={() => handleDelete(bundle.id)}
                                                >
                                                    Delete
                                                </Button>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow aria-hidden={expandedId !== bundle.id}>
                                        <TableCell sx={{ py: 0 }} colSpan={7}>
                                            <Collapse in={expandedId === bundle.id} timeout="auto" unmountOnExit>
                                                <BundleProductsPanel bundleId={bundle.id} />
                                            </Collapse>
                                        </TableCell>
                                    </TableRow>
                                </React.Fragment>
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

export default AdminProductBundleList;
