import React from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableRow,
  Box, Typography, CircularProgress, Alert
} from '@mui/material';
import useStoreBundleProductsPanelVM from './useStoreBundleProductsPanelVM';

interface StoreBundleProductsPanelProps {
    bundleId: number;
}

const StoreBundleProductsPanel: React.FC<StoreBundleProductsPanelProps> = ({ bundleId }) => {
    const vm = useStoreBundleProductsPanelVM(bundleId);

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
                Bundle Products
            </Typography>

            {vm.error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {vm.error}
                </Alert>
            )}

            {vm.bundleProducts.length === 0 && !vm.error ? (
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                    No products in this bundle
                </Typography>
            ) : (
                <Table size="small" sx={{ mb: 2 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell>Product Code</TableCell>
                            <TableCell>Product Name</TableCell>
                            <TableCell>Variation</TableCell>
                            <TableCell>Variation Type</TableCell>
                            <TableCell>Price Type</TableCell>
                            <TableCell>Qty</TableCell>
                            <TableCell>Sort Order</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {vm.bundleProducts.map((bp) => (
                            <TableRow key={bp.id}>
                                <TableCell>{bp.product_code}</TableCell>
                                <TableCell>{bp.product?.fullname || '-'}</TableCell>
                                <TableCell>{bp.product_variation?.name || '-'}</TableCell>
                                <TableCell>{bp.product_variation?.variation_type || '-'}</TableCell>
                                <TableCell>{bp.default_price_type || '-'}</TableCell>
                                <TableCell>{bp.quantity}</TableCell>
                                <TableCell>{bp.sort_order}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </Box>
    );
};

export default StoreBundleProductsPanel;
