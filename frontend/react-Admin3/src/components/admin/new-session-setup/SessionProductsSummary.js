import React, { useState, useEffect } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, CircularProgress, Alert, Box, Button
} from '@mui/material';
import { Link } from 'react-router-dom';
import storeProductService from '../../../services/storeProductService.js';

const SessionProductsSummary = ({ sessionId }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const { results } = await storeProductService.adminList({
          exam_session_id: sessionId,
          page_size: 500,
        });
        setProducts(results || []);
      } catch (err) {
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [sessionId]);

  if (loading) return <CircularProgress size={24} />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (products.length === 0) return <Typography variant="body2">No products found.</Typography>;

  return (
    <Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Product Code</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Variation</TableCell>
              <TableCell>Active</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.product_code}</TableCell>
                <TableCell>{p.subject_code}</TableCell>
                <TableCell>{p.product_name}</TableCell>
                <TableCell>{p.variation_name}</TableCell>
                <TableCell>{p.is_active ? 'Yes' : 'No'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ mt: 1, textAlign: 'right' }}>
        <Button component={Link} to="/admin/store-products" size="small">
          View All Store Products
        </Button>
      </Box>
    </Box>
  );
};

export default SessionProductsSummary;
