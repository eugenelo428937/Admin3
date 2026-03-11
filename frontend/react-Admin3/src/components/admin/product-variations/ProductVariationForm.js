// src/components/admin/product-variations/ProductVariationForm.js
import React, { useState, useEffect } from 'react';
import {
  TextField, Button, Container, Alert, Box, Typography,
  FormControl, FormLabel, CircularProgress, Select, MenuItem
} from '@mui/material';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.js';
import productVariationService from '../../../services/productVariationService.js';

const VARIATION_TYPES = [
    { value: 'eBook', label: 'eBook' },
    { value: 'Hub', label: 'Hub' },
    { value: 'Printed', label: 'Printed' },
    { value: 'Marking', label: 'Marking' },
    { value: 'Tutorial', label: 'Tutorial' }
];

const AdminProductVariationForm = () => {
    const { isSuperuser } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        variation_type: '',
        name: '',
        description: '',
        code: ''
    });

    const [loading, setLoading] = useState(isEditMode);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isEditMode) {
            const fetchProductVariation = async () => {
                try {
                    const data = await productVariationService.getById(id);
                    setFormData({
                        variation_type: data.variation_type || '',
                        name: data.name || '',
                        description: data.description || '',
                        code: data.code || ''
                    });
                } catch (err) {
                    setError('Failed to fetch product variation details. Please try again.');
                } finally {
                    setLoading(false);
                }
            };

            fetchProductVariation();
        }
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

        if (!formData.variation_type || !formData.name) {
            setError('Please fill in all required fields.');
            return;
        }

        try {
            if (isEditMode) {
                await productVariationService.update(id, formData);
            } else {
                await productVariationService.create(formData);
            }
            navigate('/admin/product-variations');
        } catch (err) {
            setError(`Failed to ${isEditMode ? 'update' : 'create'} product variation. Please check your input and try again.`);
        }
    };

    if (!isSuperuser) return <Navigate to="/" replace />;
    if (loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

    return (
        <Container sx={{ mt: 4 }}>
            <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
                {isEditMode ? 'Edit Product Variation' : 'Create Product Variation'}
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit}>
                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Variation Type</FormLabel>
                    <Select
                        name="variation_type"
                        value={formData.variation_type}
                        onChange={handleChange}
                        required
                        displayEmpty
                    >
                        <MenuItem value="" disabled>Select a variation type</MenuItem>
                        {VARIATION_TYPES.map(type => (
                            <MenuItem key={type.value} value={type.value}>
                                {type.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Name</FormLabel>
                    <TextField
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        fullWidth
                        placeholder="Enter variation name"
                    />
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Description</FormLabel>
                    <TextField
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        multiline
                        rows={3}
                        fullWidth
                        placeholder="Enter variation description"
                    />
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Code</FormLabel>
                    <TextField
                        name="code"
                        value={formData.code}
                        onChange={handleChange}
                        fullWidth
                        placeholder="Enter variation code"
                    />
                </FormControl>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="contained" type="submit">
                        {isEditMode ? 'Update' : 'Create'} Product Variation
                    </Button>
                    <Button variant="outlined" onClick={() => navigate('/admin/product-variations')}>
                        Cancel
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default AdminProductVariationForm;
