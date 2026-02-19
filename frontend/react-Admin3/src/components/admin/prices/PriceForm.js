// src/components/admin/prices/PriceForm.js
import React, { useState, useEffect } from 'react';
import {
  TextField, Button, Container, Alert, Box, Typography,
  FormControl, FormLabel, Select, MenuItem, CircularProgress
} from '@mui/material';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import priceService from '../../../services/priceService';
import storeProductService from '../../../services/storeProductService';

const AdminPriceForm = () => {
    const { isSuperuser } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        product: '',
        price_type: '',
        amount: '',
        currency: 'GBP'
    });

    const [storeProducts, setStoreProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const priceTypes = [
        { value: 'standard', label: 'Standard' },
        { value: 'retaker', label: 'Retaker' },
        { value: 'reduced', label: 'Reduced' },
        { value: 'additional', label: 'Additional' }
    ];

    useEffect(() => {
        const fetchDropdownData = async () => {
            try {
                const productsData = await storeProductService.getAll();
                setStoreProducts(Array.isArray(productsData) ? productsData : []);
            } catch (err) {
                console.error('Error fetching store products:', err);
                setError('Failed to load store products.');
            }
        };

        const fetchPrice = async () => {
            try {
                const data = await priceService.getById(id);
                setFormData({
                    product: data.product?.id || data.product || '',
                    price_type: data.price_type || '',
                    amount: data.amount !== undefined ? data.amount : '',
                    currency: data.currency || 'GBP'
                });
            } catch (err) {
                setError('Failed to load price data.');
                console.error(err);
            }
        };

        const init = async () => {
            await fetchDropdownData();
            if (isEditMode) {
                await fetchPrice();
            }
            setLoading(false);
        };

        init();
    }, [id, isEditMode]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.product || !formData.price_type || formData.amount === '') {
            setError('Please fill in all required fields (product, price type, and amount).');
            return;
        }

        if (isNaN(Number(formData.amount)) || Number(formData.amount) < 0) {
            setError('Amount must be a valid non-negative number.');
            return;
        }

        try {
            const submitData = {
                product: formData.product,
                price_type: formData.price_type,
                amount: formData.amount,
                currency: formData.currency
            };

            if (isEditMode) {
                await priceService.update(id, submitData);
            } else {
                await priceService.create(submitData);
            }
            navigate('/admin/prices');
        } catch (err) {
            setError(`Failed to ${isEditMode ? 'update' : 'create'} price: ${err.response?.data?.message || err.message}`);
            console.error(err);
        }
    };

    if (!isSuperuser) return <Navigate to="/" replace />;
    if (loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

    return (
        <Container sx={{ mt: 4 }}>
            <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
                {isEditMode ? 'Edit Price' : 'Add New Price'}
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit}>
                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Product</FormLabel>
                    <Select
                        name="product"
                        value={formData.product}
                        onChange={handleChange}
                        displayEmpty
                        fullWidth
                    >
                        <MenuItem value="" disabled>Select a product</MenuItem>
                        {storeProducts.map((product) => (
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
                        value={formData.price_type}
                        onChange={handleChange}
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
                        value={formData.amount}
                        onChange={handleChange}
                        required
                        fullWidth
                        inputProps={{ min: 0, step: '0.01' }}
                    />
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Currency</FormLabel>
                    <TextField
                        name="currency"
                        value={formData.currency}
                        onChange={handleChange}
                        required
                        fullWidth
                        inputProps={{ maxLength: 3 }}
                        helperText="ISO 4217 currency code (e.g., GBP, USD, EUR)"
                    />
                </FormControl>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="contained" type="submit">
                        {isEditMode ? 'Update Price' : 'Create Price'}
                    </Button>
                    <Button variant="outlined" onClick={() => navigate('/admin/prices')}>
                        Cancel
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default AdminPriceForm;
