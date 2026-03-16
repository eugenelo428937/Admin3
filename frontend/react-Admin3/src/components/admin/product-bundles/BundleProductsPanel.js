// src/components/admin/product-bundles/BundleProductsPanel.js
import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Autocomplete,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import catalogBundleProductService from "../../../services/catalogBundleProductService";
import catalogProductService from "../../../services/catalogProductService";
import productProductVariationService from "../../../services/productProductVariationService";

const BundleProductsPanel = ({ bundleId }) => {
  const [bundleProducts, setBundleProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editProduct, setEditProduct] = useState(null);
  const [editVariation, setEditVariation] = useState(null);
  const [editVariationOptions, setEditVariationOptions] = useState([]);

  // Add state
  const [addProduct, setAddProduct] = useState(null);
  const [addVariation, setAddVariation] = useState(null);
  const [addVariationOptions, setAddVariationOptions] = useState([]);

  const fetchBundleProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await catalogBundleProductService.getByBundleId(bundleId);
      setBundleProducts(data);
    } catch (err) {
      setError("Failed to load bundle products");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [bundleId]);

  const fetchAllProducts = useCallback(async () => {
    try {
      const data = await catalogProductService.getAll();
      setAllProducts(data);
    } catch (err) {
      console.error("Failed to load products:", err);
    }
  }, []);

  useEffect(() => {
    fetchBundleProducts();
    fetchAllProducts();
  }, [fetchBundleProducts, fetchAllProducts]);

  // When add product selection changes, fetch its variations (PPVs)
  useEffect(() => {
    if (addProduct) {
      productProductVariationService
        .getByProduct(addProduct.id)
        .then((ppvs) => {
          // Filter out PPVs already in the bundle
          const assignedPPVIds = bundleProducts.map(
            (bp) => bp.product_product_variation
          );
          const available = ppvs.filter(
            (ppv) => !assignedPPVIds.includes(ppv.id)
          );
          setAddVariationOptions(available);
        })
        .catch((err) => console.error("Failed to load variations:", err));
    } else {
      setAddVariationOptions([]);
    }
    setAddVariation(null);
  }, [addProduct, bundleProducts]);

  // When edit product selection changes, fetch its variations
  useEffect(() => {
    if (editProduct) {
      productProductVariationService
        .getByProduct(editProduct.id)
        .then((ppvs) => {
          const assignedPPVIds = bundleProducts
            .filter((bp) => bp.id !== editingId)
            .map((bp) => bp.product_product_variation);
          const available = ppvs.filter(
            (ppv) => !assignedPPVIds.includes(ppv.id)
          );
          setEditVariationOptions(available);
        })
        .catch((err) => console.error("Failed to load variations:", err));
    } else {
      setEditVariationOptions([]);
    }
    setEditVariation(null);
  }, [editProduct, bundleProducts, editingId]);

  const handleRemove = async (bpId) => {
    if (!window.confirm("Remove this product from the bundle?")) return;
    try {
      await catalogBundleProductService.delete(bpId);
      fetchBundleProducts();
    } catch (err) {
      setError("Failed to remove product");
      console.error(err);
    }
  };

  const handleAdd = async () => {
    if (!addVariation) return;
    try {
      await catalogBundleProductService.create({
        bundle: bundleId,
        product_product_variation: addVariation.id,
        default_price_type: "standard",
        quantity: 1,
        sort_order: bundleProducts.length + 1,
      });
      setAddProduct(null);
      setAddVariation(null);
      setAddVariationOptions([]);
      fetchBundleProducts();
    } catch (err) {
      setError("Failed to add product");
      console.error(err);
    }
  };

  const handleEditStart = (bp) => {
    setEditingId(bp.id);
    const matchedProduct = allProducts.find((p) => p.code === bp.product_code);
    setEditProduct(matchedProduct || null);
  };

  const handleEditSave = async (bpId) => {
    if (!editVariation) return;
    try {
      await catalogBundleProductService.update(bpId, {
        bundle: bundleId,
        product_product_variation: editVariation.id,
      });
      setEditingId(null);
      setEditProduct(null);
      setEditVariation(null);
      setEditVariationOptions([]);
      fetchBundleProducts();
    } catch (err) {
      setError("Failed to update product");
      console.error(err);
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditProduct(null);
    setEditVariation(null);
    setEditVariationOptions([]);
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
              <TableCell>Product</TableCell>
              <TableCell>Product Code</TableCell>
              <TableCell>Variation</TableCell>
              <TableCell>Variation Code</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bundleProducts.map((bp) => (
              <TableRow key={bp.id}>
                {editingId === bp.id ? (
                  <>
                    <TableCell colSpan={2}>
                      <Autocomplete
                        size="small"
                        options={allProducts}
                        getOptionLabel={(option) =>
                          `${option.shortname} (${option.code})`
                        }
                        value={editProduct}
                        onChange={(_, newValue) => setEditProduct(newValue)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Select product"
                            variant="outlined"
                            size="small"
                          />
                        )}
                        isOptionEqualToValue={(option, value) =>
                          option.id === value.id
                        }
                      />
                    </TableCell>
                    <TableCell colSpan={2}>
                      <Autocomplete
                        size="small"
                        options={editVariationOptions}
                        getOptionLabel={(option) =>
                          `${option.variation_name} (${option.variation_code})`
                        }
                        value={editVariation}
                        onChange={(_, newValue) => setEditVariation(newValue)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Select variation"
                            variant="outlined"
                            size="small"
                          />
                        )}
                        isOptionEqualToValue={(option, value) =>
                          option.id === value?.id
                        }
                        disabled={!editProduct}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleEditSave(bp.id)}
                          aria-label="save edit"
                        >
                          <CheckIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={handleEditCancel}
                          aria-label="cancel edit"
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>{bp.product_name}</TableCell>
                    <TableCell>{bp.product_code}</TableCell>
                    <TableCell>{bp.variation_name}</TableCell>
                    <TableCell>{bp.variation_code}</TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEditStart(bp)}
                          aria-label="edit product"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemove(bp.id)}
                          aria-label="remove product"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Add new product row — two linked Autocompletes */}
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <Autocomplete
          size="small"
          options={allProducts}
          getOptionLabel={(option) => `${option.shortname} (${option.code})`}
          value={addProduct}
          onChange={(_, newValue) => setAddProduct(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select product"
              variant="outlined"
              size="small"
            />
          )}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          sx={{ minWidth: 220 }}
        />
        <Autocomplete
          size="small"
          options={addVariationOptions}
          getOptionLabel={(option) =>
            `${option.variation_name} (${option.variation_code})`
          }
          value={addVariation}
          onChange={(_, newValue) => setAddVariation(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select variation"
              variant="outlined"
              size="small"
            />
          )}
          isOptionEqualToValue={(option, value) => option.id === value?.id}
          disabled={!addProduct}
          sx={{ minWidth: 220 }}
        />
        <IconButton
          size="small"
          color="primary"
          onClick={handleAdd}
          disabled={!addVariation}
          aria-label="add product to bundle"
        >
          <AddIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

export default BundleProductsPanel;
