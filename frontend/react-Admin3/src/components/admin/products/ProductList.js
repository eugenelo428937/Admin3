// src/components/admin/products/ProductList.js
import React, { useState, useEffect, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from '../../../hooks/useAuth.js';
import catalogProductService from "../../../services/catalogProductService.js";
import ProductTable from "./ProductTable.js";
import {
  Button, Container, Grid, Typography, Alert, Box, CircularProgress,
  TablePagination
} from "@mui/material";

const AdminProductList = () => {
    const { isSuperuser } = useAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [totalCount, setTotalCount] = useState(0);

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            const { results, count } = await catalogProductService.list({
                page: page + 1,
                page_size: rowsPerPage,
            });
            setProducts(results);
            setTotalCount(count);
            setError(null);
        } catch (err) {
            setError("Failed to load products");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this product?")) {
            try {
                await catalogProductService.delete(id);
                fetchProducts();
            } catch (err) {
                setError("Failed to delete product");
                console.error(err);
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
    if (error) return <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>;

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

            {products.length === 0 ? (
                <Alert severity="info">No products found</Alert>
            ) : (
                <>
                    <ProductTable
                        products={products}
                        onDelete={handleDelete}
                    />
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
                </>
            )}
        </Container>
    );
};

export default AdminProductList;
