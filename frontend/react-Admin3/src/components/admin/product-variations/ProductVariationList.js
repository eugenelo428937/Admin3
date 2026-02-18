// src/components/admin/product-variations/ProductVariationList.js
import React, { useState, useEffect } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Container, Alert, Paper, Typography, Box, CircularProgress
} from '@mui/material';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import productVariationService from '../../../services/productVariationService';

const AdminProductVariationList = () => {
    const { isSuperuser } = useAuth();
    const [productVariations, setProductVariations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchProductVariations();
    }, []);

    const fetchProductVariations = async () => {
        try {
            const data = await productVariationService.getAll();
            if (Array.isArray(data)) {
                setProductVariations(data);
            } else if (data && data.results && Array.isArray(data.results)) {
                setProductVariations(data.results);
            } else if (data && typeof data === 'object') {
                setProductVariations(Object.values(data));
            } else {
                setProductVariations([]);
                setError('Unexpected data format received from server');
            }
        } catch (err) {
            console.error('Error fetching product variations:', err);
            setError('Failed to fetch product variations. Please try again later.');
            setProductVariations([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this product variation?')) {
            try {
                await productVariationService.delete(id);
                setProductVariations(productVariations.filter(pv => pv.id !== id));
            } catch (err) {
                setError('Failed to delete product variation. Please try again later.');
            }
        }
    };

    if (!isSuperuser) return <Navigate to="/" replace />;
    if (loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

    return (
        <Container sx={{ mt: 4 }}>
            <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
                Product Variations
            </Typography>

            <Button
                component={Link}
                to="/admin/product-variations/new"
                variant="contained"
                sx={{ mb: 3 }}
            >
                Create New Product Variation
            </Button>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {productVariations.length === 0 && !error ? (
                <Alert severity="info">No product variations found.</Alert>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Variation Type</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Code</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {Array.isArray(productVariations) && productVariations.map(pv => (
                                <TableRow key={pv.id} hover>
                                    <TableCell>{pv.id}</TableCell>
                                    <TableCell>{pv.variation_type || '-'}</TableCell>
                                    <TableCell>{pv.name || '-'}</TableCell>
                                    <TableCell>{pv.code || '-'}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Button
                                                component={Link}
                                                to={`/admin/product-variations/${pv.id}/edit`}
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
                                                onClick={() => handleDelete(pv.id)}
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
        </Container>
    );
};

export default AdminProductVariationList;
