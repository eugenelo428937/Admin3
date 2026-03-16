import React from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Container, Alert, Paper, Typography, Box, CircularProgress
} from '@mui/material';
import { Link, Navigate } from 'react-router-dom';
import useProductVariationListVM from './useProductVariationListVM';

const AdminProductVariationList: React.FC = () => {
    const vm = useProductVariationListVM();

    if (!vm.isSuperuser) return <Navigate to="/" replace />;
    if (vm.loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

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

            {vm.error && <Alert severity="error" sx={{ mb: 3 }}>{vm.error}</Alert>}

            {vm.productVariations.length === 0 && !vm.error ? (
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
                            {Array.isArray(vm.productVariations) && vm.productVariations.map(pv => (
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
                                                onClick={() => vm.handleDelete(pv.id)}
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
