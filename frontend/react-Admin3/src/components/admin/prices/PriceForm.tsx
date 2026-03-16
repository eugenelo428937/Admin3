import React from 'react';
import {
  TextField, Button, Container, Alert, Box, Typography,
  FormControl, FormLabel, Select, MenuItem, CircularProgress
} from '@mui/material';
import { Navigate } from 'react-router-dom';
import usePriceFormVM from './usePriceFormVM';

const priceTypes = [
    { value: 'standard', label: 'Standard' },
    { value: 'retaker', label: 'Retaker' },
    { value: 'reduced', label: 'Reduced' },
    { value: 'additional', label: 'Additional' },
];

const AdminPriceForm: React.FC = () => {
    const vm = usePriceFormVM();

    if (!vm.isSuperuser) return <Navigate to="/" replace />;
    if (vm.loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

    return (
        <Container sx={{ mt: 4 }}>
            <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
                {vm.isEditMode ? 'Edit Price' : 'Add New Price'}
            </Typography>

            {vm.error && <Alert severity="error" sx={{ mb: 3 }}>{vm.error}</Alert>}

            <Box component="form" onSubmit={vm.handleSubmit}>
                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Product</FormLabel>
                    <Select
                        name="product"
                        value={vm.formData.product}
                        onChange={(e) => vm.handleChange(e as any)}
                        displayEmpty
                        fullWidth
                    >
                        <MenuItem value="" disabled>Select a product</MenuItem>
                        {vm.storeProducts.map((product) => (
                            <MenuItem key={product.id} value={product.id}>
                                {product.product_code || `Product ID: ${product.id}`}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Price Type</FormLabel>
                    <Select
                        name="price_type"
                        value={vm.formData.price_type}
                        onChange={(e) => vm.handleChange(e as any)}
                        displayEmpty
                        fullWidth
                    >
                        <MenuItem value="" disabled>Select a price type</MenuItem>
                        {priceTypes.map((pt) => (
                            <MenuItem key={pt.value} value={pt.value}>
                                {pt.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Amount</FormLabel>
                    <TextField
                        name="amount"
                        type="number"
                        value={vm.formData.amount}
                        onChange={vm.handleChange}
                        required
                        fullWidth
                        inputProps={{ min: 0, step: '0.01' }}
                    />
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Currency</FormLabel>
                    <TextField
                        name="currency"
                        value={vm.formData.currency}
                        onChange={vm.handleChange}
                        required
                        fullWidth
                        inputProps={{ maxLength: 3 }}
                        helperText="ISO 4217 currency code (e.g., GBP, USD, EUR)"
                    />
                </FormControl>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="contained" type="submit">
                        {vm.isEditMode ? 'Update Price' : 'Create Price'}
                    </Button>
                    <Button variant="outlined" onClick={vm.handleCancel}>
                        Cancel
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default AdminPriceForm;
