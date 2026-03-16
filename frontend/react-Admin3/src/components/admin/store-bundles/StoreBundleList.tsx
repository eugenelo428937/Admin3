import React from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Container, Alert, Paper, Typography, Box, CircularProgress,
  TablePagination, IconButton, Collapse
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { Link, Navigate } from 'react-router-dom';
import useStoreBundleListVM from './useStoreBundleListVM';
import StoreBundleProductsPanel from './StoreBundleProductsPanel.tsx';

const AdminStoreBundleList: React.FC = () => {
    const vm = useStoreBundleListVM();

    if (!vm.isSuperuser) return <Navigate to="/" replace />;
    if (vm.loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

    return (
        <Container sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" component="h2">Store Bundles</Typography>
                <Button component={Link} to="/admin/store-bundles/new" variant="contained">
                    Add New Store Bundle
                </Button>
            </Box>

            {vm.error && <Alert severity="error" sx={{ mb: 3 }}>{vm.error}</Alert>}

            {vm.storeBundles.length === 0 && !vm.error ? (
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
                            {vm.storeBundles.map((bundle) => (
                                <React.Fragment key={bundle.id}>
                                    <TableRow hover>
                                        <TableCell>
                                            <IconButton
                                                size="small"
                                                onClick={() => vm.handleToggleExpand(bundle.id)}
                                                aria-label={vm.expandedId === bundle.id
                                                    ? `Collapse products for ${bundle.name}`
                                                    : `Expand products for ${bundle.name}`}
                                            >
                                                {vm.expandedId === bundle.id
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
                                                    onClick={() => vm.handleDelete(bundle.id)}
                                                >
                                                    Delete
                                                </Button>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow aria-hidden={vm.expandedId !== bundle.id}>
                                        <TableCell sx={{ py: 0 }} colSpan={9}>
                                            <Collapse in={vm.expandedId === bundle.id} timeout="auto" unmountOnExit>
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

export default AdminStoreBundleList;
