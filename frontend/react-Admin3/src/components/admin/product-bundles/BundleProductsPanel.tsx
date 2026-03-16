import React from 'react';
import {
    Table, TableBody, TableCell, TableHead, TableRow,
    IconButton, Autocomplete, TextField, Box, Typography,
    CircularProgress, Alert
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import useBundleProductsPanelVM from './useBundleProductsPanelVM';
import type { Product, ProductProductVariation } from '../../../types/product';

interface BundleProductsPanelProps {
    bundleId: number;
}

const BundleProductsPanel: React.FC<BundleProductsPanelProps> = ({ bundleId }) => {
    const vm = useBundleProductsPanelVM(bundleId);

    if (vm.loading) {
        return (
            <Box sx={{ textAlign: 'center', py: 3 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                Bundle Products
            </Typography>

            {vm.error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {vm.error}
                </Alert>
            )}

            {vm.bundleProducts.length === 0 && !vm.error ? (
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
                        {vm.bundleProducts.map((bp) => (
                            <TableRow key={bp.id}>
                                {vm.editingId === bp.id ? (
                                    <>
                                        <TableCell colSpan={2}>
                                            <Autocomplete
                                                size="small"
                                                options={vm.allProducts}
                                                getOptionLabel={(option: Product) =>
                                                    `${option.shortname} (${option.code})`
                                                }
                                                value={vm.editProduct}
                                                onChange={(_: unknown, newValue: Product | null) =>
                                                    vm.setEditProduct(newValue)
                                                }
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
                                                options={vm.editVariationOptions}
                                                getOptionLabel={(option: ProductProductVariation) =>
                                                    `${option.variation_name} (${option.variation_code})`
                                                }
                                                value={vm.editVariation}
                                                onChange={(_: unknown, newValue: ProductProductVariation | null) =>
                                                    vm.setEditVariation(newValue)
                                                }
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
                                                disabled={!vm.editProduct}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                <IconButton
                                                    size="small"
                                                    color="success"
                                                    onClick={() => vm.handleEditSave(bp.id)}
                                                    aria-label="save edit"
                                                >
                                                    <CheckIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={vm.handleEditCancel}
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
                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => vm.handleEditStart(bp)}
                                                    aria-label="edit product"
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => vm.handleRemove(bp.id)}
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

            {/* Add new product row -- two linked Autocompletes */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Autocomplete
                    size="small"
                    options={vm.allProducts}
                    getOptionLabel={(option: Product) => `${option.shortname} (${option.code})`}
                    value={vm.addProduct}
                    onChange={(_: unknown, newValue: Product | null) => vm.setAddProduct(newValue)}
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
                    options={vm.addVariationOptions}
                    getOptionLabel={(option: ProductProductVariation) =>
                        `${option.variation_name} (${option.variation_code})`
                    }
                    value={vm.addVariation}
                    onChange={(_: unknown, newValue: ProductProductVariation | null) =>
                        vm.setAddVariation(newValue)
                    }
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Select variation"
                            variant="outlined"
                            size="small"
                        />
                    )}
                    isOptionEqualToValue={(option, value) => option.id === value?.id}
                    disabled={!vm.addProduct}
                    sx={{ minWidth: 220 }}
                />
                <IconButton
                    size="small"
                    color="primary"
                    onClick={vm.handleAdd}
                    disabled={!vm.addVariation}
                    aria-label="add product to bundle"
                >
                    <AddIcon />
                </IconButton>
            </Box>
        </Box>
    );
};

export default BundleProductsPanel;
