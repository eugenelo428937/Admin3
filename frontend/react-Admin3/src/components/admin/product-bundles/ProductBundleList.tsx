import React from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Button, Container, Alert, Paper, Typography, Box, CircularProgress, TablePagination,
    IconButton, Collapse
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { Link, Navigate } from 'react-router-dom';
import useProductBundleListVM from './useProductBundleListVM';
import BundleProductsPanel from './BundleProductsPanel.tsx';
import type { ProductBundle } from '../../../types/productBundle';

const AdminProductBundleList: React.FC = () => {
    const vm = useProductBundleListVM();

    if (!vm.isSuperuser) return <Navigate to="/" replace />;
    if (vm.loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

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

            {vm.error && <Alert severity="error" sx={{ mb: 3 }}>{vm.error}</Alert>}

            {vm.bundles.length === 0 && !vm.error ? (
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
                            {Array.isArray(vm.bundles) && vm.bundles.map((bundle: ProductBundle) => (
                                <React.Fragment key={bundle.id}>
                                    <TableRow hover>
                                        <TableCell>
                                            <IconButton
                                                size="small"
                                                onClick={() => vm.handleToggleExpand(bundle.id)}
                                                aria-label={vm.expandedId === bundle.id
                                                    ? `Collapse products for ${bundle.bundle_name}`
                                                    : `Expand products for ${bundle.bundle_name}`}
                                            >
                                                {vm.expandedId === bundle.id
                                                    ? <KeyboardArrowUpIcon />
                                                    : <KeyboardArrowDownIcon />}
                                            </IconButton>
                                        </TableCell>
                                        <TableCell>{bundle.id}</TableCell>
                                        <TableCell>{bundle.bundle_name || '-'}</TableCell>
                                        <TableCell>{(bundle.subject as { id: number; code: string })?.code || '-'}</TableCell>
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
                                                    onClick={() => vm.handleDelete(bundle.id)}
                                                >
                                                    Delete
                                                </Button>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow aria-hidden={vm.expandedId !== bundle.id}>
                                        <TableCell sx={{ py: 0 }} colSpan={7}>
                                            <Collapse in={vm.expandedId === bundle.id} timeout="auto" unmountOnExit>
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
        </Container>
    );
};

export default AdminProductBundleList;
