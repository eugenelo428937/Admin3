// src/components/products/ProductForm.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Form, Button, Container } from "react-bootstrap";
import productService from "../../../services/productService";

const AdminProductForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;
    
    const [formData, setFormData] = useState({
        code: "",
        fullname: "",    // Changed from name to fullname
        shortname: "",   // Added shortname field
        description: "",
        active: true
    });
    
    const [loading, setLoading] = useState(isEditMode);
    const [error, setError] = useState(null);
    const [validated, setValidated] = useState(false);

    useEffect(() => {
        if (isEditMode) {
            const fetchProduct = async () => {
                try {
                    const data = await productService.getById(id);
                    setFormData({
                        code: data.code || "",
                        fullname: data.fullname || "",    // Match backend field names
                        shortname: data.shortname || "",  // Match backend field names
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
        const form = e.currentTarget;
        
        if (form.checkValidity() === false) {
            e.stopPropagation();
            setValidated(true);
            return;
        }

        try {
            const productData = {
                ...formData
            };

            if (isEditMode) {
                await productService.update(id, productData);
            } else {
                await productService.create(productData);
            }
            navigate("/products");
        } catch (err) {
            setError(`Failed to ${isEditMode ? "update" : "create"} product: ${err.response?.data?.message || err.message}`);
            console.error(err);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <Container>
            <h2>{isEditMode ? "Edit Product" : "Add New Product"}</h2>
            {error && <div className="alert alert-danger">{error}</div>}
            
            <Form noValidate validated={validated} onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                    <Form.Label>Code</Form.Label>
                    <Form.Control
                        type="text"
                        name="code"
                        value={formData.code}
                        onChange={handleChange}
                        required
                        maxLength="10"
                        disabled={isEditMode} // Typically codes shouldn't be changed once created
                    />
                    <Form.Control.Feedback type="invalid">
                        Please provide a product code.
                    </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>Full Name</Form.Label>
                    <Form.Control
                        type="text"
                        name="fullname"  // Changed from name to fullname
                        value={formData.fullname}
                        onChange={handleChange}
                        required
                    />
                    <Form.Control.Feedback type="invalid">
                        Please provide a full product name.
                    </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>Short Name</Form.Label>
                    <Form.Control
                        type="text"
                        name="shortname"  // New field for shortname
                        value={formData.shortname}
                        onChange={handleChange}
                        required
                        maxLength="20"
                    />
                    <Form.Control.Feedback type="invalid">
                        Please provide a short product name.
                    </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={3}
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                    />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Check
                        type="checkbox"
                        label="Active"
                        name="active"
                        checked={formData.active}
                        onChange={handleChange}
                    />
                </Form.Group>

                <Button variant="primary" type="submit">
                    {isEditMode ? "Update Product" : "Create Product"}
                </Button>
                {" "}
                <Button variant="secondary" onClick={() => navigate("/products")}>
                    Cancel
                </Button>
            </Form>
        </Container>
    );
};

export default AdminProductForm;
