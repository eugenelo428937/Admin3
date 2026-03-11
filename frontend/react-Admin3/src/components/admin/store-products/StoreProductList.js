// src/components/admin/store-products/StoreProductList.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Container, Alert, Paper, Typography, Box, CircularProgress,
  TablePagination, IconButton, Collapse
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.js';
import storeProductService from '../../../services/storeProductService.js';
import StoreProductVariationsPanel from './StoreProductVariationsPanel.js';

/**
 * Groups a flat array of store products into a hierarchy:
 *   session_code → subject_code → catalog_product_id → [store products]
 */
const groupStoreProducts = (storeProducts) => {
    const grouped = {};

    storeProducts.forEach(sp => {
        const session = sp.session_code || 'Unknown Session';
        const subject = sp.subject_code || 'Unknown Subject';
        const cpId = sp.catalog_product_id || `orphan-${sp.id}`;

        if (!grouped[session]) grouped[session] = {};
        if (!grouped[session][subject]) grouped[session][subject] = {};
        if (!grouped[session][subject][cpId]) {
            grouped[session][subject][cpId] = {
                catalog_product_id: sp.catalog_product_id,
                catalog_product_code: sp.catalog_product_code,
                product_name: sp.product_name,
                variations: [],
            };
        }
        grouped[session][subject][cpId].variations.push(sp);
    });

    return grouped;
};

/** Count total store products under a session group. */
const countSessionProducts = (subjects) =>
    Object.values(subjects).reduce(
        (sum, products) => sum + Object.values(products).reduce(
            (s, p) => s + p.variations.length, 0
        ), 0
    );

/** Count total store products under a subject group. */
const countSubjectProducts = (products) =>
    Object.values(products).reduce((sum, p) => sum + p.variations.length, 0);

const COL_COUNT = 5;

const AdminStoreProductList = () => {
    const { isSuperuser } = useAuth();
    const [pageProducts, setPageProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(400);
    const [totalCount, setTotalCount] = useState(0);

    // Collapsible state — track expanded items (everything collapsed by default)
    const [expandedSessions, setExpandedSessions] = useState({});
    const [expandedSubjects, setExpandedSubjects] = useState({});
    const [expandedProduct, setExpandedProduct] = useState(null);

    const toggleSession = (session) => {
        setExpandedSessions(prev => ({ ...prev, [session]: !prev[session] }));
    };

    const toggleSubject = (key) => {
        setExpandedSubjects(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleProduct = (key) => {
        setExpandedProduct(prev => prev === key ? null : key);
    };

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            const { results, count } = await storeProductService.adminList({
                page: page + 1,
                page_size: rowsPerPage,
            });
            setPageProducts(results);
            setTotalCount(count);
            setError(null);
        } catch (err) {
            console.error('Error fetching store products:', err);
            setError('Failed to fetch store products. Please try again later.');
            setPageProducts([]);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
        setExpandedProduct(null);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
        setExpandedProduct(null);
    };

    const groupedData = useMemo(() => groupStoreProducts(pageProducts), [pageProducts]);

    const sortedSessions = useMemo(
        () => Object.keys(groupedData).sort((a, b) => b.localeCompare(a)),
        [groupedData]
    );

    if (!isSuperuser) return <Navigate to="/" replace />;
    if (loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

    return (
        <Container sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" component="h2">Store Products</Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                        {totalCount} store product{totalCount !== 1 ? 's' : ''} total
                    </Typography>
                    <Button component={Link} to="/admin/store-products/new" variant="contained">
                        Add New Store Product
                    </Button>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {pageProducts.length === 0 && !error ? (
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
                            {sortedSessions.map(sessionCode => {
                                const subjects = groupedData[sessionCode];
                                const sortedSubjects = Object.keys(subjects).sort();
                                const sessionExpanded = !expandedSessions[sessionCode];
                                const sessionProductCount = countSessionProducts(subjects);

                                return (
                                    <React.Fragment key={sessionCode}>
                                        {/* Session group header — collapsible */}
                                        <TableRow
                                            sx={{ cursor: 'pointer' }}
                                            onClick={() => toggleSession(sessionCode)}
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

                                        {sessionExpanded && sortedSubjects.map(subjectCode => {
                                            const products = subjects[subjectCode];
                                            const subjectKey = `${sessionCode}-${subjectCode}`;
                                            const subjectExpanded = !!expandedSubjects[subjectKey];
                                            const sortedProducts = Object.values(products)
                                                .sort((a, b) => (a.catalog_product_code || '').localeCompare(b.catalog_product_code || ''));
                                            const subjectProductCount = countSubjectProducts(products);

                                            return (
                                                <React.Fragment key={subjectKey}>
                                                    {/* Subject group header — collapsible */}
                                                    <TableRow
                                                        sx={{ cursor: 'pointer' }}
                                                        onClick={() => toggleSubject(subjectKey)}
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

                                                    {subjectExpanded && sortedProducts.map(product => {
                                                        const expandKey = `${sessionCode}-${subjectCode}-${product.catalog_product_id}`;

                                                        return (
                                                            <React.Fragment key={expandKey}>
                                                                <TableRow hover>
                                                                    <TableCell>
                                                                        <IconButton
                                                                            size="small"
                                                                            onClick={() => toggleProduct(expandKey)}
                                                                            aria-label={expandedProduct === expandKey
                                                                                ? `Collapse variations for ${product.catalog_product_code}`
                                                                                : `Expand variations for ${product.catalog_product_code}`}
                                                                        >
                                                                            {expandedProduct === expandKey
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
                                                                <TableRow aria-hidden={expandedProduct !== expandKey}>
                                                                    <TableCell sx={{ py: 0 }} colSpan={COL_COUNT}>
                                                                        <Collapse in={expandedProduct === expandKey} timeout="auto" unmountOnExit>
                                                                            <StoreProductVariationsPanel
                                                                                storeProducts={product.variations}
                                                                                onRefresh={fetchProducts}
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

            {totalCount > rowsPerPage && (
                <TablePagination
                    component="div"
                    count={totalCount}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[50, 100, 200, 400]}
                />
            )}
        </Container>
    );
};

export default AdminStoreProductList;
