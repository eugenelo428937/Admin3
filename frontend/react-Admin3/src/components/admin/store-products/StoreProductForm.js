// src/components/admin/store-products/StoreProductForm.js
import React, { useState, useEffect } from 'react';
import {
  TextField, Button, Container, Alert, Box, Typography,
  FormControl, FormLabel, Checkbox, FormControlLabel,
  Select, MenuItem, CircularProgress
} from '@mui/material';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import storeProductService from '../../../services/storeProductService';
import examSessionSubjectService from '../../../services/examSessionSubjectService';
import productProductVariationService from '../../../services/productProductVariationService';

const AdminStoreProductForm = () => {
    const { isSuperuser } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        exam_session_subject: '',
        product_product_variation: '',
        is_active: true,
        product_code: ''
    });

    const [examSessionSubjects, setExamSessionSubjects] = useState([]);
    const [productProductVariations, setProductProductVariations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDropdownData = async () => {
            try {
                const [essData, ppvData] = await Promise.all([
                    examSessionSubjectService.getAll(),
                    productProductVariationService.getAll()
                ]);
                setExamSessionSubjects(Array.isArray(essData) ? essData : []);
                setProductProductVariations(Array.isArray(ppvData) ? ppvData : []);
            } catch (err) {
                console.error('Error fetching dropdown data:', err);
                setError('Failed to load dropdown options.');
            }
        };

        const fetchStoreProduct = async () => {
            try {
                const data = await storeProductService.getById(id);
                setFormData({
                    exam_session_subject: data.exam_session_subject?.id || data.exam_session_subject || '',
                    product_product_variation: data.product_product_variation?.id || data.product_product_variation || '',
                    is_active: data.is_active !== undefined ? data.is_active : true,
                    product_code: data.product_code || ''
                });
            } catch (err) {
                setError('Failed to load store product data.');
                console.error(err);
            }
        };

        const init = async () => {
            await fetchDropdownData();
            if (isEditMode) {
                await fetchStoreProduct();
            }
            setLoading(false);
        };

        init();
    }, [id, isEditMode]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.exam_session_subject || !formData.product_product_variation) {
            setError('Please select both an exam session subject and a product product variation.');
            return;
        }

        try {
            const submitData = {
                exam_session_subject: formData.exam_session_subject,
                product_product_variation: formData.product_product_variation,
                is_active: formData.is_active
            };

            if (isEditMode) {
                await storeProductService.update(id, submitData);
            } else {
                await storeProductService.create(submitData);
            }
            navigate('/admin/store-products');
        } catch (err) {
            setError(`Failed to ${isEditMode ? 'update' : 'create'} store product: ${err.response?.data?.message || err.message}`);
            console.error(err);
        }
    };

    if (!isSuperuser) return <Navigate to="/" replace />;
    if (loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

    return (
        <Container sx={{ mt: 4 }}>
            <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
                {isEditMode ? 'Edit Store Product' : 'Add New Store Product'}
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit}>
                {isEditMode && formData.product_code && (
                    <FormControl fullWidth sx={{ mb: 3 }}>
                        <FormLabel>Product Code</FormLabel>
                        <TextField
                            name="product_code"
                            value={formData.product_code}
                            fullWidth
                            disabled
                            helperText="Product code is auto-generated and cannot be changed"
                        />
                    </FormControl>
                )}

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Exam Session Subject</FormLabel>
                    <Select
                        name="exam_session_subject"
                        value={formData.exam_session_subject}
                        onChange={handleChange}
                        displayEmpty
                        fullWidth
                    >
                        <MenuItem value="" disabled>Select an exam session subject</MenuItem>
                        {examSessionSubjects.map((ess) => (
                            <MenuItem key={ess.id} value={ess.id}>
                                {ess.subject_code || ess.subject?.code || ''} - {ess.session_code || ess.exam_session?.session_code || ''} (ID: {ess.id})
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Product Product Variation</FormLabel>
                    <Select
                        name="product_product_variation"
                        value={formData.product_product_variation}
                        onChange={handleChange}
                        displayEmpty
                        fullWidth
                    >
                        <MenuItem value="" disabled>Select a product product variation</MenuItem>
                        {productProductVariations.map((ppv) => (
                            <MenuItem key={ppv.id} value={ppv.id}>
                                {ppv.product_code || ppv.product?.code || ''} - {ppv.variation_code || ppv.product_variation?.code || ''} (ID: {ppv.id})
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                name="is_active"
                                checked={formData.is_active}
                                onChange={handleChange}
                            />
                        }
                        label="Is Active"
                    />
                </FormControl>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="contained" type="submit">
                        {isEditMode ? 'Update Store Product' : 'Create Store Product'}
                    </Button>
                    <Button variant="outlined" onClick={() => navigate('/admin/store-products')}>
                        Cancel
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default AdminStoreProductForm;
