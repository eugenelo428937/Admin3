import React from 'react';
import {
    Table, TableBody, TableCell, TableHead, TableRow,
    IconButton, Autocomplete, TextField, Box, Typography,
    CircularProgress, Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import useProductVariationsPanelVM from './useProductVariationsPanelVM';

interface ProductVariationsPanelProps {
    productId: number;
}

const ProductVariationsPanel: React.FC<ProductVariationsPanelProps> = ({ productId }) => {
    const vm = useProductVariationsPanelVM(productId);

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
                Product Variations
            </Typography>

            {vm.error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {vm.error}
                </Alert>
            )}

            {vm.variations.length === 0 && !vm.error ? (
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
                        {vm.variations.map((ppv) => (
                            <TableRow key={ppv.id}>
                                {vm.editingId === ppv.id ? (
                                    <>
                                        <TableCell colSpan={3}>
                                            <Autocomplete
                                                size="small"
                                                options={vm.getUnassignedVariations(ppv.product_variation)}
                                                getOptionLabel={(option) =>
                                                    `${option.name} (${option.code})`
                                                }
                                                value={vm.editVariation}
                                                onChange={(_, newValue) => vm.setEditVariation(newValue)}
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
                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                <IconButton
                                                    size="small"
                                                    color="success"
                                                    onClick={() => vm.handleEditSave(ppv.id)}
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
                                        <TableCell>{ppv.variation_name}</TableCell>
                                        <TableCell>{ppv.variation_code}</TableCell>
                                        <TableCell>{ppv.variation_type}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => vm.handleEditStart(ppv)}
                                                    aria-label="edit variation"
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => vm.handleRemove(ppv.id)}
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
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Autocomplete
                    size="small"
                    options={vm.getUnassignedVariations()}
                    getOptionLabel={(option) => `${option.name} (${option.code})`}
                    value={vm.addVariation}
                    onChange={(_, newValue) => vm.setAddVariation(newValue)}
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
                    onClick={vm.handleAdd}
                    disabled={!vm.addVariation}
                    aria-label="add variation"
                >
                    <AddIcon />
                </IconButton>
            </Box>
        </Box>
    );
};

export default ProductVariationsPanel;
