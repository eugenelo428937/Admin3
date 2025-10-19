// src/components/products/ProductList.js
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import productService from "../../../services/productService";
import ProductTable from "./ProductTable";
import {
  Button,
  Container,
  Grid,
  Typography,
  Alert,
  Box,
  CircularProgress
} from "@mui/material";

const AdminProductList = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const data = await productService.getAll();
            setProducts(data);
            setError(null);
        } catch (err) {
            setError("Failed to load products");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this product?")) {
            try {
                await productService.delete(id);
                setProducts(products.filter(product => product.id !== id));
            } catch (err) {
                setError("Failed to delete product");
                console.error(err);
            }
        }
    };

    if (loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>;

    return (
			<Container sx={{ mt: 4 }}>
				<Grid container sx={{ mb: 3 }}>
					<Grid size={{ xs: 12, md: 6 }}>
						<Typography variant="h4" component="h2">Products</Typography>
					</Grid>
					<Grid size={{ xs: 12, md: 6 }} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
						<Box sx={{ display: 'flex', gap: 2, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
							<Button component={Link} to="/products/new" variant="contained">
								Add New Product
							</Button>
							<Button component={Link} to="/products/import" variant="outlined">
								Import Products
							</Button>
						</Box>
					</Grid>
				</Grid>

				{products.length === 0 ? (
					<Alert severity="info">No products found</Alert>
				) : (
					<ProductTable
						products={products}
						onDelete={handleDelete}
					/>
				)}
			</Container>
		);
};

export default AdminProductList;
