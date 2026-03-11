// src/components/admin/products/ProductVariationsPanel.js
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
import productProductVariationService from "../../../services/productProductVariationService.js";
import productVariationService from "../../../services/productVariationService.js";

const ProductVariationsPanel = ({ productId }) => {
  const [variations, setVariations] = useState([]);
  const [allVariations, setAllVariations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editVariation, setEditVariation] = useState(null);
  const [addVariation, setAddVariation] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ppvs, allVars] = await Promise.all([
        productProductVariationService.getByProduct(productId),
        productVariationService.getAll(),
      ]);
      setVariations(ppvs);
      setAllVariations(allVars);
    } catch (err) {
      setError("Failed to load variations");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const assignedVariationIds = variations.map((v) => v.product_variation);

  const getUnassignedVariations = (excludeVariationId = null) => {
    return allVariations.filter(
      (v) =>
        !assignedVariationIds.includes(v.id) || v.id === excludeVariationId
    );
  };

  const handleRemove = async (ppvId) => {
    if (!window.confirm("Are you sure you want to remove this variation?")) {
      return;
    }
    try {
      await productProductVariationService.delete(ppvId);
      await fetchData();
    } catch (err) {
      setError("Failed to remove variation");
      console.error(err);
    }
  };

  const handleEditStart = (ppv) => {
    setEditingId(ppv.id);
    const currentVariation = allVariations.find(
      (v) => v.id === ppv.product_variation
    );
    setEditVariation(currentVariation || null);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditVariation(null);
  };

  const handleEditSave = async (ppvId) => {
    if (!editVariation) return;
    try {
      await productProductVariationService.update(ppvId, {
        product: productId,
        product_variation: editVariation.id,
      });
      setEditingId(null);
      setEditVariation(null);
      await fetchData();
    } catch (err) {
      setError("Failed to update variation");
      console.error(err);
    }
  };

  const handleAdd = async () => {
    if (!addVariation) return;
    try {
      await productProductVariationService.create({
        product: productId,
        product_variation: addVariation.id,
      });
      setAddVariation(null);
      await fetchData();
    } catch (err) {
      setError("Failed to add variation");
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
        Product Variations
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {variations.length === 0 && !error ? (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          No variations assigned
        </Typography>
      ) : (
        <Table size="small" sx={{ mb: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {variations.map((ppv) => (
              <TableRow key={ppv.id}>
                {editingId === ppv.id ? (
                  <>
                    <TableCell colSpan={3}>
                      <Autocomplete
                        size="small"
                        options={getUnassignedVariations(ppv.product_variation)}
                        getOptionLabel={(option) =>
                          `${option.name} (${option.code})`
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
                          option.id === value.id
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleEditSave(ppv.id)}
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
                    <TableCell>{ppv.variation_name}</TableCell>
                    <TableCell>{ppv.variation_code}</TableCell>
                    <TableCell>{ppv.variation_type}</TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEditStart(ppv)}
                          aria-label="edit variation"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemove(ppv.id)}
                          aria-label="remove variation"
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

      {/* Add new variation row */}
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <Autocomplete
          size="small"
          options={getUnassignedVariations()}
          getOptionLabel={(option) => `${option.name} (${option.code})`}
          value={addVariation}
          onChange={(_, newValue) => setAddVariation(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Add variation"
              variant="outlined"
              size="small"
            />
          )}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          sx={{ minWidth: 250 }}
        />
        <IconButton
          size="small"
          color="primary"
          onClick={handleAdd}
          disabled={!addVariation}
          aria-label="add variation"
        >
          <AddIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

export default ProductVariationsPanel;
