// src/components/products/ProductList.js
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import productService from "../../../services/productService";
import ProductTable from "./ProductTable";
import { Button, Container, Row, Col } from "react-bootstrap";

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

    if (loading) return <div>Loading products...</div>;
    if (error) return <div className="alert alert-danger">{error}</div>;

    return (
			<Container className="mt-4">
				<Row className="mb-3">
					<Col>
						<h2>Products</h2>
					</Col>
					<Col className="text-end">
						<Link to="/products/new">
							<Button variant="primary">Add New Product</Button>
						</Link>{" "}
						<Link to="/products/import">
							<Button variant="secondary">Import Products</Button>
						</Link>
					</Col>
				</Row>

				{products.length === 0 ? (
					<div>No products found</div>
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
