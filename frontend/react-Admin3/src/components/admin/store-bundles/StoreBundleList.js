// src/components/admin/store-bundles/StoreBundleList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Container, Alert, Paper, Typography, Box, CircularProgress,
  TablePagination, IconButton, Collapse
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.tsx';
import storeBundleService from '../../../services/storeBundleService';
import StoreBundleProductsPanel from './StoreBundleProductsPanel.js';

const AdminStoreBundleList = () => {
    const { isSuperuser } = useAuth();
    const [storeBundles, setStoreBundles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [totalCount, setTotalCount] = useState(0);
    const [expandedId, setExpandedId] = useState(null);

    const handleToggleExpand = (bundleId) => {
        setExpandedId(prev => prev === bundleId ? null : bundleId);
    };

    const fetchStoreBundles = useCallback(async () => {
        try {
            setLoading(true);
            const { results, count } = await storeBundleService.adminList({
                page: page + 1,
                page_size: rowsPerPage,
            });
            setStoreBundles(results);
            setTotalCount(count);
            setError(null);
        } catch (err) {
            console.error('Error fetching store bundles:', err);
            setError('Failed to fetch store bundles. Please try again later.');
            setStoreBundles([]);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage]);

    useEffect(() => {
        fetchStoreBundles();
    }, [fetchStoreBundles]);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this store bundle?')) {
            try {
                await storeBundleService.delete(id);
                fetchStoreBundles();
            } catch (err) {
                setError('Failed to delete store bundle. Please try again later.');
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
                <Typography variant="h4" component="h2">Store Bundles</Typography>
                <Button component={Link} to="/admin/store-bundles/new" variant="contained">
                    Add New Store Bundle
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {storeBundles.length === 0 && !error ? (
                <Alert severity="info">No store bundles found.</Alert>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: 50 }} />
                                <TableCell>ID</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Template</TableCell>
                                <TableCell>Subject</TableCell>
                                <TableCell>Exam Session</TableCell>
                                <TableCell>Active</TableCell>
                                <TableCell>Components</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {storeBundles.map((bundle) => (
                                <React.Fragment key={bundle.id}>
                                    <TableRow hover>
                                        <TableCell>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleToggleExpand(bundle.id)}
                                                aria-label={expandedId === bundle.id
                                                    ? `Collapse products for ${bundle.name}`
                                                    : `Expand products for ${bundle.name}`}
                                            >
                                                {expandedId === bundle.id
                                                    ? <KeyboardArrowUpIcon />
                                                    : <KeyboardArrowDownIcon />}
                                            </IconButton>
                                        </TableCell>
                                        <TableCell>{bundle.id}</TableCell>
                                        <TableCell>{bundle.name || '-'}</TableCell>
                                        <TableCell>{bundle.bundle_template_name || '-'}</TableCell>
                                        <TableCell>{bundle.subject_code || '-'}</TableCell>
                                        <TableCell>{bundle.exam_session_code || '-'}</TableCell>
                                        <TableCell>{bundle.is_active ? 'Active' : 'Inactive'}</TableCell>
                                        <TableCell>{bundle.components_count !== undefined ? bundle.components_count : '-'}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <Button
                                                    component={Link}
                                                    to={`/admin/store-bundles/${bundle.id}/edit`}
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
                                        <TableCell sx={{ py: 0 }} colSpan={9}>
                                            <Collapse in={expandedId === bundle.id} timeout="auto" unmountOnExit>
                                                <StoreBundleProductsPanel bundleId={bundle.id} />
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

export default AdminStoreBundleList;
