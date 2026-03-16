import React from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Button, Container, Alert, Paper, Typography, Box, CircularProgress,
    TablePagination, IconButton, Collapse,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { Link, Navigate } from 'react-router-dom';
import StoreProductVariationsPanel from './StoreProductVariationsPanel.tsx';
import useStoreProductListVM from './useStoreProductListVM';

const COL_COUNT = 5;

const AdminStoreProductList: React.FC = () => {
    const vm = useStoreProductListVM();

    if (!vm.isSuperuser) return <Navigate to="/" replace />;
    if (vm.loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

    return (
        <Container sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" component="h2">Store Products</Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                        {vm.totalCount} store product{vm.totalCount !== 1 ? 's' : ''} total
                    </Typography>
                    <Button component={Link} to="/admin/store-products/new" variant="contained">
                        Add New Store Product
                    </Button>
                </Box>
            </Box>

            {vm.error && <Alert severity="error" sx={{ mb: 3 }}>{vm.error}</Alert>}

            {vm.pageProducts.length === 0 && !vm.error ? (
                <Alert severity="info">No store products found.</Alert>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: 50 }} />
                                <TableCell>Product Code</TableCell>
                                <TableCell>Product Name</TableCell>
                                <TableCell>Variations</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {vm.sortedSessions.map((sessionCode) => {
                                const subjects = vm.groupedData[sessionCode];
                                const sortedSubjects = Object.keys(subjects).sort();
                                const sessionExpanded = !vm.expandedSessions[sessionCode];
                                const sessionProductCount = vm.countSessionProducts(subjects);

                                return (
                                    <React.Fragment key={sessionCode}>
                                        <TableRow
                                            sx={{ cursor: 'pointer' }}
                                            onClick={() => vm.toggleSession(sessionCode)}
                                        >
                                            <TableCell
                                                colSpan={COL_COUNT}
                                                sx={{
                                                    bgcolor: 'primary.main',
                                                    color: 'primary.contrastText',
                                                    py: 0.75,
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <IconButton
                                                        size="small"
                                                        sx={{ color: 'inherit', p: 0.25 }}
                                                        aria-label={sessionExpanded
                                                            ? `Collapse session ${sessionCode}`
                                                            : `Expand session ${sessionCode}`}
                                                    >
                                                        {sessionExpanded
                                                            ? <KeyboardArrowUpIcon fontSize="small" />
                                                            : <KeyboardArrowDownIcon fontSize="small" />}
                                                    </IconButton>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'inherit' }}>
                                                        Exam Session: {sessionCode}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: 'inherit', opacity: 0.8 }}>
                                                        ({sortedSubjects.length} subject{sortedSubjects.length !== 1 ? 's' : ''}, {sessionProductCount} product{sessionProductCount !== 1 ? 's' : ''})
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                        </TableRow>

                                        {sessionExpanded && sortedSubjects.map((subjectCode) => {
                                            const products = subjects[subjectCode];
                                            const subjectKey = `${sessionCode}-${subjectCode}`;
                                            const subjectExpanded = !!vm.expandedSubjects[subjectKey];
                                            const sortedProducts = Object.values(products)
                                                .sort((a, b) => (a.catalog_product_code || '').localeCompare(b.catalog_product_code || ''));
                                            const subjectProductCount = vm.countSubjectProducts(products);

                                            return (
                                                <React.Fragment key={subjectKey}>
                                                    <TableRow
                                                        sx={{ cursor: 'pointer' }}
                                                        onClick={() => vm.toggleSubject(subjectKey)}
                                                    >
                                                        <TableCell
                                                            colSpan={COL_COUNT}
                                                            sx={{
                                                                bgcolor: 'grey.100',
                                                                py: 0.5,
                                                                pl: 4,
                                                            }}
                                                        >
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <IconButton
                                                                    size="small"
                                                                    sx={{ p: 0.25 }}
                                                                    aria-label={subjectExpanded
                                                                        ? `Collapse subject ${subjectCode}`
                                                                        : `Expand subject ${subjectCode}`}
                                                                >
                                                                    {subjectExpanded
                                                                        ? <KeyboardArrowUpIcon fontSize="small" />
                                                                        : <KeyboardArrowDownIcon fontSize="small" />}
                                                                </IconButton>
                                                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                                    Subject: {subjectCode}
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    ({sortedProducts.length} product{sortedProducts.length !== 1 ? 's' : ''}, {subjectProductCount} variation{subjectProductCount !== 1 ? 's' : ''})
                                                                </Typography>
                                                            </Box>
                                                        </TableCell>
                                                    </TableRow>

                                                    {subjectExpanded && sortedProducts.map((product) => {
                                                        const expandKey = `${sessionCode}-${subjectCode}-${product.catalog_product_id}`;

                                                        return (
                                                            <React.Fragment key={expandKey}>
                                                                <TableRow hover>
                                                                    <TableCell>
                                                                        <IconButton
                                                                            size="small"
                                                                            onClick={() => vm.toggleProduct(expandKey)}
                                                                            aria-label={vm.expandedProduct === expandKey
                                                                                ? `Collapse variations for ${product.catalog_product_code}`
                                                                                : `Expand variations for ${product.catalog_product_code}`}
                                                                        >
                                                                            {vm.expandedProduct === expandKey
                                                                                ? <KeyboardArrowUpIcon />
                                                                                : <KeyboardArrowDownIcon />}
                                                                        </IconButton>
                                                                    </TableCell>
                                                                    <TableCell>{product.catalog_product_code || '-'}</TableCell>
                                                                    <TableCell>{product.product_name || '-'}</TableCell>
                                                                    <TableCell>{product.variations.length}</TableCell>
                                                                    <TableCell>
                                                                        {product.catalog_product_id && (
                                                                            <Button
                                                                                component={Link}
                                                                                to={`/admin/products/${product.catalog_product_id}`}
                                                                                variant="contained"
                                                                                color="info"
                                                                                size="small"
                                                                            >
                                                                                View
                                                                            </Button>
                                                                        )}
                                                                    </TableCell>
                                                                </TableRow>
                                                                <TableRow aria-hidden={vm.expandedProduct !== expandKey}>
                                                                    <TableCell sx={{ py: 0 }} colSpan={COL_COUNT}>
                                                                        <Collapse in={vm.expandedProduct === expandKey} timeout="auto" unmountOnExit>
                                                                            <StoreProductVariationsPanel
                                                                                storeProducts={product.variations}
                                                                                onRefresh={vm.fetchProducts}
                                                                            />
                                                                        </Collapse>
                                                                    </TableCell>
                                                                </TableRow>
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
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
                    rowsPerPageOptions={[50, 100, 200, 400]}
                />
            )}
        </Container>
    );
};

export default AdminStoreProductList;
