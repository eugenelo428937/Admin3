// src/components/admin/store-products/StoreProductVariationsPanel.js
import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
} from "@mui/material";
import { Link } from "react-router-dom";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import storeProductService from "../../../services/storeProductService.js";

/**
 * Displays store product variations for a catalog product.
 *
 * Supports two modes:
 * - Pre-fetched: Pass `storeProducts` array directly (used by grouped list)
 * - Fetch mode: Pass `catalogProductId` to fetch from API (standalone usage)
 *
 * When `onRefresh` is provided, delete triggers parent re-fetch.
 */
const StoreProductVariationsPanel = ({
  catalogProductId,
  storeProducts: providedProducts,
  onRefresh,
}) => {
  const [fetchedProducts, setFetchedProducts] = useState([]);
  const [loading, setLoading] = useState(!providedProducts);
  const [error, setError] = useState(null);

  const fetchStoreProducts = useCallback(async () => {
    if (providedProducts) return;
    try {
      setLoading(true);
      setError(null);
      const data = await storeProductService.getByCatalogProduct(catalogProductId);
      setFetchedProducts(data);
    } catch (err) {
      setError("Failed to load store products");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [catalogProductId, providedProducts]);

  useEffect(() => {
    fetchStoreProducts();
  }, [fetchStoreProducts]);

  const products = providedProducts || fetchedProducts;

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this store product?")) return;
    try {
      await storeProductService.delete(id);
      if (onRefresh) {
        onRefresh();
      } else {
        fetchStoreProducts();
      }
    } catch (err) {
      setError("Failed to delete store product");
      console.error(err);
    }
  };

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
        Store Products (Variations)
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {products.length === 0 && !error ? (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          No store products for this catalog product
        </Typography>
      ) : (
        <Table size="small" sx={{ mb: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>Product Code</TableCell>
              <TableCell>Variation</TableCell>
              <TableCell>Variation Type</TableCell>
              <TableCell>Active</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>{product.product_code}</TableCell>
                <TableCell>{product.variation_name || '-'}</TableCell>
                <TableCell>{product.variation_type || '-'}</TableCell>
                <TableCell>{product.is_active ? 'Active' : 'Inactive'}</TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <IconButton
                      size="small"
                      color="primary"
                      component={Link}
                      to={`/admin/store-products/${product.id}/edit`}
                      aria-label="edit store product"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(product.id)}
                      aria-label="delete store product"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Button
        component={Link}
        to="/admin/store-products/new"
        variant="outlined"
        size="small"
      >
        Add Store Product
      </Button>
    </Box>
  );
};

export default StoreProductVariationsPanel;
