// src/components/products/ProductDetail.js
import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Container,
  Alert,
  Box,
  Typography,
  CircularProgress
} from "@mui/material";
import productService from "../../../services/productService";

const AdminProductDetail = () => {
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

    if (loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>;
    if (!product) return <Alert severity="warning" sx={{ mt: 4 }}>Product not found</Alert>;

    return (
			<Container sx={{ mt: 4 }}>
				<Typography variant="h4" component="h2" sx={{ mb: 4 }}>Product Details</Typography>
				<Card>
					<CardHeader
						title={product.fullname}
						titleTypographyProps={{ variant: 'h5' }}
					/>
					<CardContent>
						<Typography sx={{ mb: 1 }}>
							<strong>Code:</strong> {product.code}
						</Typography>
						<Typography sx={{ mb: 1 }}>
							<strong>Short Name:</strong> {product.shortname}
						</Typography>
						<Typography sx={{ mb: 1 }}>
							<strong>Description:</strong> {product.description || "No description"}
						</Typography>
						<Typography sx={{ mb: 1 }}>
							<strong>Status:</strong> {product.active ? "Active" : "Inactive"}
						</Typography>
						<Typography sx={{ mb: 1 }}>
							<strong>Created:</strong> {new Date(product.created_at).toLocaleString()}
						</Typography>
						<Typography sx={{ mb: 1 }}>
							<strong>Last Updated:</strong> {new Date(product.updated_at).toLocaleString()}
						</Typography>
					</CardContent>
					<CardActions>
						<Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'space-between', p: 1 }}>
							<Box sx={{ display: 'flex', gap: 2 }}>
								<Button
									component={Link}
									to={`/products/edit/${product.id}`}
									variant="contained"
									color="warning"
								>
									Edit
								</Button>
								<Button
									variant="contained"
									color="error"
									onClick={handleDelete}
								>
									Delete
								</Button>
							</Box>
							<Button component={Link} to="/products" variant="outlined">
								Back to List
							</Button>
						</Box>
					</CardActions>
				</Card>
			</Container>
		);
};

export default AdminProductDetail;
