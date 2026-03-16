// src/components/admin/product-bundles/ProductBundleForm.js
import React, { useState, useEffect } from 'react';
import {
  TextField, Button, Container, Alert, Box, Typography,
  FormControl, FormLabel, Checkbox, FormControlLabel, CircularProgress,
  Select, MenuItem
} from '@mui/material';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.js';
import catalogBundleService from '../../../services/catalogBundleService.js';
import subjectService from '../../../services/subjectService';

const AdminProductBundleForm = () => {
    const { isSuperuser } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        bundle_name: '',
        subject: '',
        description: '',
        is_featured: false,
        is_active: true,
        display_order: 0
    });

    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const data = await subjectService.getAll();
                setSubjects(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Error fetching subjects:', err);
                setError('Failed to load subjects. Please try again.');
            }
        };

        const fetchBundle = async () => {
            try {
                const data = await catalogBundleService.getById(id);
                setFormData({
                    bundle_name: data.bundle_name || '',
                    subject: data.subject?.id || data.subject || '',
                    description: data.description || '',
                    is_featured: data.is_featured !== undefined ? data.is_featured : false,
                    is_active: data.is_active !== undefined ? data.is_active : true,
                    display_order: data.display_order !== undefined ? data.display_order : 0
                });
            } catch (err) {
                setError('Failed to fetch product bundle details. Please try again.');
            }
        };

        const initializeForm = async () => {
            await fetchSubjects();
            if (isEditMode) {
                await fetchBundle();
            }
            setLoading(false);
        };

        initializeForm();
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

        if (!formData.bundle_name) {
            setError('Please provide a bundle name.');
            return;
        }

        try {
            const submitData = {
                ...formData,
                display_order: parseInt(formData.display_order, 10) || 0
            };

            if (isEditMode) {
                await catalogBundleService.update(id, submitData);
            } else {
                await catalogBundleService.create(submitData);
            }
            navigate('/admin/product-bundles');
        } catch (err) {
            setError(`Failed to ${isEditMode ? 'update' : 'create'} product bundle. Please check your input and try again.`);
        }
    };

    if (!isSuperuser) return <Navigate to="/" replace />;
    if (loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

    return (
        <Container sx={{ mt: 4 }}>
            <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
                {isEditMode ? 'Edit Product Bundle' : 'Create Product Bundle'}
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit}>
                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Bundle Name</FormLabel>
                    <TextField
                        name="bundle_name"
                        value={formData.bundle_name}
                        onChange={handleChange}
                        required
                        fullWidth
                        placeholder="Enter bundle name"
                    />
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Subject</FormLabel>
                    <Select
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        displayEmpty
                    >
                        <MenuItem value="" disabled>Select a subject</MenuItem>
                        {subjects.map(subject => (
                            <MenuItem key={subject.id} value={subject.id}>
                                {subject.code}
                            </MenuItem>
                        ))}
                    </Select>
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
                        placeholder="Enter bundle description"
                    />
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                name="is_featured"
                                checked={formData.is_featured}
                                onChange={handleChange}
                            />
                        }
                        label="Featured"
                    />
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
                        label="Active"
                    />
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Display Order</FormLabel>
                    <TextField
                        name="display_order"
                        type="number"
                        value={formData.display_order}
                        onChange={handleChange}
                        fullWidth
                        placeholder="Enter display order"
                        inputProps={{ min: 0 }}
                    />
                </FormControl>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="contained" type="submit">
                        {isEditMode ? 'Update' : 'Create'} Product Bundle
                    </Button>
                    <Button variant="outlined" onClick={() => navigate('/admin/product-bundles')}>
                        Cancel
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default AdminProductBundleForm;
