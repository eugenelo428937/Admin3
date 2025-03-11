// src/components/products/ProductDetail.js
import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button, Card, Container } from "react-bootstrap";
import productService from "../../services/productService";

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const data = await productService.getById(id);
                setProduct(data);
                setError(null);
            } catch (err) {
                setError("Failed to load product details");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [id]);

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete this product?")) {
            try {
                await productService.delete(id);
                navigate("/products");
            } catch (err) {
                setError("Failed to delete product");
                console.error(err);
            }
        }
    };

    if (loading) return <div>Loading product details...</div>;
    if (error) return <div className="alert alert-danger">{error}</div>;
    if (!product) return <div>Product not found</div>;

    return (
        <Container>
            <h2>Product Details</h2>
            <Card>
                <Card.Body>
                    <Card.Title>{product.name}</Card.Title>
                    <Card.Text>
                        <strong>Code:</strong> {product.code}<br />
                        <strong>Description:</strong> {product.description || "No description"}<br />
                        <strong>Status:</strong> {product.active ? "Active" : "Inactive"}<br />
                        <strong>Created:</strong> {new Date(product.created_at).toLocaleString()}<br />
                        <strong>Last Updated:</strong> {new Date(product.updated_at).toLocaleString()}
                    </Card.Text>
                    
                    <Link to={`/products/edit/${product.id}`}>
                        <Button variant="warning" className="me-2">Edit</Button>
                    </Link>
                    <Button variant="danger" onClick={handleDelete}>Delete</Button>
                    {" "}
                    <Link to="/products">
                        <Button variant="secondary">Back to List</Button>
                    </Link>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default ProductDetail;
