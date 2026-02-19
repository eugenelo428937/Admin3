// src/components/admin/products/ProductForm.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from '../../../hooks/useAuth';
import {
  TextField, Button, Container, Alert, Box, Typography,
  FormControl, FormLabel, Checkbox, FormControlLabel, CircularProgress
} from "@mui/material";
import catalogProductService from "../../../services/catalogProductService";

const AdminProductForm = () => {
    const { isSuperuser } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        code: "",
        fullname: "",
        shortname: "",
        description: "",
        active: true
    });

    const [loading, setLoading] = useState(isEditMode);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isEditMode) {
            const fetchProduct = async () => {
                try {
                    const data = await catalogProductService.getById(id);
                    setFormData({
                        code: data.code || "",
                        fullname: data.fullname || "",
                        shortname: data.shortname || "",
                        description: data.description || "",
                        active: data.active
                    });
                    setError(null);
                } catch (err) {
                    setError("Failed to load product data");
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            };

            fetchProduct();
        }
    }, [id, isEditMode]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === "checkbox" ? checked : value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.code || !formData.fullname || !formData.shortname) {
            setError("Please fill in all required fields");
            return;
        }

        try {
            const productData = { ...formData };

            if (isEditMode) {
                await catalogProductService.update(id, productData);
            } else {
                await catalogProductService.create(productData);
            }
            navigate("/admin/products");
        } catch (err) {
            setError(`Failed to ${isEditMode ? "update" : "create"} product: ${err.response?.data?.message || err.message}`);
            console.error(err);
        }
    };

    if (!isSuperuser) return <Navigate to="/" replace />;
    if (loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

    return (
        <Container sx={{ mt: 4 }}>
            <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
                {isEditMode ? "Edit Product" : "Add New Product"}
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit}>
                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Code</FormLabel>
                    <TextField
                        name="code"
                        value={formData.code}
                        onChange={handleChange}
                        required
                        inputProps={{ maxLength: 10 }}
                        disabled={isEditMode}
                        fullWidth
                        helperText={isEditMode ? "Codes cannot be changed after creation" : ""}
                    />
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Full Name</FormLabel>
                    <TextField name="fullname" value={formData.fullname} onChange={handleChange} required fullWidth />
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Short Name</FormLabel>
                    <TextField name="shortname" value={formData.shortname} onChange={handleChange} required inputProps={{ maxLength: 20 }} fullWidth />
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Description</FormLabel>
                    <TextField multiline rows={3} name="description" value={formData.description} onChange={handleChange} fullWidth />
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormControlLabel
                        control={<Checkbox name="active" checked={formData.active} onChange={handleChange} />}
                        label="Active"
                    />
                </FormControl>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="contained" type="submit">
                        {isEditMode ? "Update Product" : "Create Product"}
                    </Button>
                    <Button variant="outlined" onClick={() => navigate("/admin/products")}>
                        Cancel
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default AdminProductForm;
