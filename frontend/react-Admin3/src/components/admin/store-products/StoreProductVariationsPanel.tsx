import React from 'react';
import {
    Table, TableBody, TableCell, TableHead, TableRow,
    IconButton, Box, Typography, CircularProgress, Alert, Button,
} from '@mui/material';
import { Link } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import useStoreProductVariationsPanelVM from './useStoreProductVariationsPanelVM';
import type { StoreProduct } from '../../../types/storeProduct';

interface StoreProductVariationsPanelProps {
    catalogProductId?: number;
    storeProducts?: StoreProduct[];
    onRefresh?: () => void;
}

const StoreProductVariationsPanel: React.FC<StoreProductVariationsPanelProps> = ({
    catalogProductId,
    storeProducts,
    onRefresh,
}) => {
    const vm = useStoreProductVariationsPanelVM({
        catalogProductId,
        storeProducts,
        onRefresh,
    });

    if (vm.loading) {
        return (
            <Box sx={{ textAlign: 'center', py: 3 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                Store Products (Variations)
            </Typography>

            {vm.error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {vm.error}
                </Alert>
            )}

            {vm.products.length === 0 && !vm.error ? (
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                    No store products for this catalog product
                </Typography>
            ) : (
                <Table size="small" sx={{ mb: 2 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell>Product Code</TableCell>
                            <TableCell>Variation</TableCell>
                            <TableCell>Variation Type</TableCell>
                            <TableCell>Active</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {vm.products.map((product) => (
                            <TableRow key={product.id}>
                                <TableCell>{product.product_code}</TableCell>
                                <TableCell>{product.variation_name || '-'}</TableCell>
                                <TableCell>{product.variation_type || '-'}</TableCell>
                                <TableCell>{product.is_active ? 'Active' : 'Inactive'}</TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        <IconButton
                                            size="small"
                                            color="primary"
                                            component={Link}
                                            to={`/admin/store-products/${product.id}/edit`}
                                            aria-label="edit store product"
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => vm.handleDelete(product.id)}
                                            aria-label="delete store product"
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            <Button
                component={Link}
                to="/admin/store-products/new"
                variant="outlined"
                size="small"
            >
                Add Store Product
            </Button>
        </Box>
    );
};

export default StoreProductVariationsPanel;
