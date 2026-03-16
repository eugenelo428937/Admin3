import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
    Button, Card, CardHeader, CardContent, CardActions,
    Container, Alert, Box, Typography, CircularProgress,
} from '@mui/material';
import useProductDetailVM from './useProductDetailVM';

const AdminProductDetail: React.FC = () => {
    const vm = useProductDetailVM();

    if (!vm.isSuperuser) return <Navigate to="/" replace />;
    if (vm.loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;
    if (vm.error) return <Alert severity="error" sx={{ mt: 4 }}>{vm.error}</Alert>;
    if (!vm.product) return <Alert severity="warning" sx={{ mt: 4 }}>Product not found</Alert>;

    return (
        <Container sx={{ mt: 4 }}>
            <Typography variant="h4" component="h2" sx={{ mb: 4 }}>Product Details</Typography>
            <Card>
                <CardHeader title={vm.product.fullname} titleTypographyProps={{ variant: 'h5' }} />
                <CardContent>
                    <Typography sx={{ mb: 1 }}><strong>Code:</strong> {vm.product.code}</Typography>
                    <Typography sx={{ mb: 1 }}><strong>Short Name:</strong> {vm.product.shortname}</Typography>
                    <Typography sx={{ mb: 1 }}><strong>Description:</strong> {vm.product.description || 'No description'}</Typography>
                    <Typography sx={{ mb: 1 }}><strong>Status:</strong> {vm.product.active ? 'Active' : 'Inactive'}</Typography>
                    <Typography sx={{ mb: 1 }}><strong>Created:</strong> {new Date(vm.product.created_at).toLocaleString()}</Typography>
                    <Typography sx={{ mb: 1 }}><strong>Last Updated:</strong> {new Date(vm.product.updated_at).toLocaleString()}</Typography>
                </CardContent>
                <CardActions>
                    <Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'space-between', p: 1 }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button component={Link} to={`/admin/products/${vm.product.id}/edit`} variant="contained" color="warning">
                                Edit
                            </Button>
                            <Button variant="contained" color="error" onClick={vm.handleDelete}>
                                Delete
                            </Button>
                        </Box>
                        <Button component={Link} to="/admin/products" variant="outlined">
                            Back to List
                        </Button>
                    </Box>
                </CardActions>
            </Card>
        </Container>
    );
};

export default AdminProductDetail;
