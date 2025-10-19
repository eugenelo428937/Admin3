// src/components/products/ProductImport.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Container,
  Alert,
  Box,
  Typography,
  FormControl,
  FormLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from "@mui/material";
import Papa from "papaparse";
import productService from "../../../services/productService";

const AdminProductImport = () => {
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
                        const products = result.data.map(product => ({
                            ...product,
                            active: product.active === "true" || product.active === true
                        }));

                        const response = await productService.bulkImport(products);
                        setSuccess(`Successfully imported ${response.created || products.length} products.`);

                        setFile(null);
                        setPreview([]);

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
			<Container sx={{ mt: 4 }}>
				<Typography variant="h4" component="h2" sx={{ mb: 4 }}>Import Products</Typography>

				{error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
				{success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

				<Box component="form" onSubmit={handleSubmit}>
					<FormControl fullWidth sx={{ mb: 3 }}>
						<FormLabel>Upload CSV File</FormLabel>
						<input
							type="file"
							accept=".csv"
							onChange={handleFileChange}
							required
							style={{ marginTop: '8px' }}
						/>
						<Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
							The CSV file should include columns: code, name, description (optional), active (true/false).
						</Typography>
					</FormControl>

					{preview.length > 0 && (
						<Box sx={{ mb: 3 }}>
							<Typography variant="h5" sx={{ mb: 2 }}>Preview</Typography>
							<TableContainer component={Paper}>
								<Table size="small">
									<TableHead>
										<TableRow>
											{Object.keys(preview[0]).map((key) => (
												<TableCell key={key}>{key}</TableCell>
											))}
										</TableRow>
									</TableHead>
									<TableBody>
										{preview.map((row, i) => (
											<TableRow key={i}>
												{Object.values(row).map((val, j) => (
													<TableCell key={j}>{val}</TableCell>
												))}
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>
							<Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
								Showing first {preview.length} rows
							</Typography>
						</Box>
					)}

					<Box sx={{ display: 'flex', gap: 2 }}>
						<Button
							variant="contained"
							type="submit"
							disabled={loading || !file}
						>
							{loading ? "Importing..." : "Import Products"}
						</Button>
						<Button
							variant="outlined"
							onClick={() => navigate("/products")}
						>
							Cancel
						</Button>
					</Box>
				</Box>

				<Box sx={{ mt: 4 }}>
					<Typography variant="h5" sx={{ mb: 2 }}>CSV Format Guide</Typography>
					<Typography sx={{ mb: 2 }}>Your CSV file should follow this format:</Typography>
					<Box
						component="pre"
						sx={{
							bgcolor: 'grey.100',
							p: 3,
							border: 1,
							borderColor: 'divider',
							borderRadius: 1,
							overflowX: 'auto'
						}}
					>
						code,fullname,shortname,description,active{"\n"}
						PRD001,Product One Complete Name,Prod1,This is product one,true{"\n"}
						PRD002,Product Two Complete Name,Prod2,This is product two,true{"\n"}
						PRD003,Product Three Complete Name,Prod3,This is product three,false
					</Box>
					<Box component="ul" sx={{ mt: 2 }}>
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
					</Box>
				</Box>
			</Container>
		);
};

export default AdminProductImport;
