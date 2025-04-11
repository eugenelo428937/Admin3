import React, { useState, useEffect } from "react";
import { Container, Table, Button, Alert } from "react-bootstrap";
import { Link } from "react-router-dom";
import productService from "../services/productService";

const ProductList = () => {
	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		fetchAvailableProducts();
	}, []);

	const fetchAvailableProducts = async () => {
		try {
			const data = await productService.getAvailableProducts();

			// Check what data structure is being returned
			console.log("API Response:", data);
			// Ensure subjects is always an array
			if (Array.isArray(data)) {
				setProducts(data);
			} else if (data && data.results && Array.isArray(data.results)) {
				// If data is wrapped in an object with a results property
				setProducts(data.results);
			} else if (data && typeof data === "object") {
				// If data is an object of subjects
				setProducts(Object.values(data));
			} else {
				// Default to empty array if data format is unrecognized
				setProducts([]);
				setError("Unexpected data format received from server");
				console.error("Unexpected data format:", data);
			}

			setLoading(false);
		} catch (error) {
			console.error("Error fetching products:", error);
			return []; // Return empty array on error
		}
	};
	return "";
};
export default ProductList;
