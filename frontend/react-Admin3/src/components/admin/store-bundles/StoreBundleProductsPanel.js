// src/components/admin/store-bundles/StoreBundleProductsPanel.js
import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import storeBundleService from "../../../services/storeBundleService.js";

const StoreBundleProductsPanel = ({ bundleId }) => {
  const [bundleProducts, setBundleProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBundleProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await storeBundleService.getProducts(bundleId);
      setBundleProducts(data);
    } catch (err) {
      setError("Failed to load bundle products");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [bundleId]);

  useEffect(() => {
    fetchBundleProducts();
  }, [fetchBundleProducts]);

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", py: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: "bold" }}>
        Bundle Products
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {bundleProducts.length === 0 && !error ? (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          No products in this bundle
        </Typography>
      ) : (
        <Table size="small" sx={{ mb: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>Product Code</TableCell>
              <TableCell>Product Name</TableCell>
              <TableCell>Variation</TableCell>
              <TableCell>Variation Type</TableCell>
              <TableCell>Price Type</TableCell>
              <TableCell>Qty</TableCell>
              <TableCell>Sort Order</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bundleProducts.map((bp) => (
              <TableRow key={bp.id}>
                <TableCell>{bp.product_code}</TableCell>
                <TableCell>{bp.product?.fullname || '-'}</TableCell>
                <TableCell>{bp.product_variation?.name || '-'}</TableCell>
                <TableCell>{bp.product_variation?.variation_type || '-'}</TableCell>
                <TableCell>{bp.default_price_type || '-'}</TableCell>
                <TableCell>{bp.quantity}</TableCell>
                <TableCell>{bp.sort_order}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
};

export default StoreBundleProductsPanel;
