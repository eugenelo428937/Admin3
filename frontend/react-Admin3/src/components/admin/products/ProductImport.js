// src/components/products/ProductImport.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Button, Container, Alert } from "react-bootstrap";
import Papa from "papaparse"; // You'll need to install this: npm install papaparse
import productService from "../../../services/productService";

const ProductImport = () => {
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
        
        if (selectedFile) {
            Papa.parse(selectedFile, {
                header: true,
                skipEmptyLines: true,
                complete: (result) => {
                    // Limit preview to first 5 rows
                    setPreview(result.data.slice(0, 5));
                    
                    if (result.errors.length > 0) {
                        setError(`CSV parsing errors: ${result.errors.map(e => e.message).join(', ')}`);
                    } else {
                        setError(null);
                    }
                }
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setError("Please select a file to import");
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            // Parse the entire CSV file
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: async (result) => {
                    if (result.errors.length > 0) {
                        setError(`CSV parsing errors: ${result.errors.map(e => e.message).join(', ')}`);
                        setLoading(false);
                        return;
                    }

                    try {
                        // Process data to ensure values are handled correctly
                        const products = result.data.map(product => ({
                            ...product,
                            active: product.active === "true" || product.active === true
                        }));

                        // Send to bulk import API
                        const response = await productService.bulkImport(products);
                        setSuccess(`Successfully imported ${response.created || products.length} products.`);
                        
                        // Clear the form
                        setFile(null);
                        setPreview([]);
                        
                        // Show success for a few seconds then redirect
                        setTimeout(() => {
                            navigate("/products");
                        }, 3000);
                    } catch (err) {
                        setError(`Import failed: ${err.message || "Unknown error"}`);
                    } finally {
                        setLoading(false);
                    }
                }
            });
        } catch (err) {
            setError(`File processing error: ${err.message || "Unknown error"}`);
            setLoading(false);
        }
    };

    return (
			<Container>
				<h2>Import Products</h2>

				{error && <Alert variant="danger">{error}</Alert>}
				{success && <Alert variant="success">{success}</Alert>}

				<Form onSubmit={handleSubmit}>
					<Form.Group className="mb-3">
						<Form.Label>Upload CSV File</Form.Label>
						<Form.Control
							type="file"
							accept=".csv"
							onChange={handleFileChange}
							required
						/>
						<Form.Text className="text-muted">
							The CSV file should include columns: code, name, description (optional), active (true/false).
						</Form.Text>
					</Form.Group>
					{preview.length > 0 && (
						<div className="mb-3">
							<h5>Preview</h5>
							<div className="table-responsive">
								<table className="table table-sm table-bordered">
									<thead>
										<tr>
											{Object.keys(preview[0]).map((key) => (
												<th key={key}>{key}</th>
											))}
										</tr>
									</thead>
									<tbody>
										{preview.map((row, i) => (
											<tr key={i}>
												{Object.values(row).map((val, j) => (
													<td key={j}>{val}</td>
												))}
											</tr>
										))}
									</tbody>
								</table>
							</div>
							<p className="text-muted">Showing first {preview.length} rows</p>
						</div>
					)}
					<Button
						variant="primary"
						type="submit"
						disabled={loading || !file}>
						{loading ? "Importing..." : "Import Products"}
					</Button>{" "}
					<Button
						variant="secondary"
						onClick={() => navigate("/products")}>
						Cancel
					</Button>
				</Form>

				<div className="mt-4">
					<h4>CSV Format Guide</h4>
					<p>Your CSV file should follow this format:</p>
					<pre className="bg-light p-3 border rounded">
						code,fullname,shortname,description,active
						<br />
						PRD001,Product One Complete Name,Prod1,This is product one,true
						<br />
						PRD002,Product Two Complete Name,Prod2,This is product two,true
						<br />
						PRD003,Product Three Complete Name,Prod3,This is product three,false
					</pre>
					<ul>
						<li>
							<strong>code</strong> - Unique product identifier (required)
						</li>
						<li>
							<strong>fullname</strong> - Complete product name (required)
						</li>
						<li>
							<strong>shortname</strong> - Abbreviated product name (required)
						</li>
						<li>
							<strong>description</strong> - Product description (optional)
						</li>
						<li>
							<strong>active</strong> - Product status (true/false)
						</li>
					</ul>
				</div>
			</Container>
		);
};

export default ProductImport;
