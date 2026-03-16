// src/components/admin/recommendations/RecommendationForm.js
import React, { useState, useEffect } from 'react';
import {
  Button, Container, Alert, Box, Typography,
  FormControl, FormLabel, Select, MenuItem, CircularProgress
} from '@mui/material';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.tsx';
import recommendationService from '../../../services/recommendationService';
import productProductVariationService from '../../../services/productProductVariationService';

const AdminRecommendationForm = () => {
    const { isSuperuser } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        source_ppv: '',
        recommended_ppv: ''
    });

    const [productProductVariations, setProductProductVariations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDropdownData = async () => {
            try {
                const ppvData = await productProductVariationService.getAll();
                setProductProductVariations(Array.isArray(ppvData) ? ppvData : []);
            } catch (err) {
                console.error('Error fetching product product variations:', err);
                setError('Failed to load dropdown options.');
            }
        };

        const fetchRecommendation = async () => {
            try {
                const data = await recommendationService.getById(id);
                setFormData({
                    source_ppv: data.source_ppv?.id || data.source_ppv || '',
                    recommended_ppv: data.recommended_ppv?.id || data.recommended_ppv || ''
                });
            } catch (err) {
                setError('Failed to load recommendation data.');
                console.error(err);
            }
        };

        const init = async () => {
            await fetchDropdownData();
            if (isEditMode) {
                await fetchRecommendation();
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

        if (!formData.source_ppv || !formData.recommended_ppv) {
            setError('Please select both a source and recommended product product variation.');
            return;
        }

        if (formData.source_ppv === formData.recommended_ppv) {
            setError('Source and recommended product product variation cannot be the same.');
            return;
        }

        try {
            const submitData = {
                source_ppv: formData.source_ppv,
                recommended_ppv: formData.recommended_ppv
            };

            if (isEditMode) {
                await recommendationService.update(id, submitData);
            } else {
                await recommendationService.create(submitData);
            }
            navigate('/admin/recommendations');
        } catch (err) {
            setError(`Failed to ${isEditMode ? 'update' : 'create'} recommendation: ${err.response?.data?.message || err.message}`);
            console.error(err);
        }
    };

    if (!isSuperuser) return <Navigate to="/" replace />;
    if (loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

    return (
        <Container sx={{ mt: 4 }}>
            <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
                {isEditMode ? 'Edit Recommendation' : 'Add New Recommendation'}
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit}>
                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Source Product Product Variation</FormLabel>
                    <Select
                        name="source_ppv"
                        value={formData.source_ppv}
                        onChange={handleChange}
                        displayEmpty
                        fullWidth
                    >
                        <MenuItem value="" disabled>Select a source product product variation</MenuItem>
                        {productProductVariations.map((ppv) => (
                            <MenuItem key={ppv.id} value={ppv.id}>
                                {ppv.product_code || ppv.product?.code || ''} - {ppv.variation_code || ppv.product_variation?.code || ''} (ID: {ppv.id})
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Recommended Product Product Variation</FormLabel>
                    <Select
                        name="recommended_ppv"
                        value={formData.recommended_ppv}
                        onChange={handleChange}
                        displayEmpty
                        fullWidth
                    >
                        <MenuItem value="" disabled>Select a recommended product product variation</MenuItem>
                        {productProductVariations.map((ppv) => (
                            <MenuItem key={ppv.id} value={ppv.id}>
                                {ppv.product_code || ppv.product?.code || ''} - {ppv.variation_code || ppv.product_variation?.code || ''} (ID: {ppv.id})
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="contained" type="submit">
                        {isEditMode ? 'Update Recommendation' : 'Create Recommendation'}
                    </Button>
                    <Button variant="outlined" onClick={() => navigate('/admin/recommendations')}>
                        Cancel
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default AdminRecommendationForm;
