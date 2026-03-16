import React from 'react';
import {
  TextField, Button, Container, Alert, Box, Typography,
  FormControl, FormLabel, CircularProgress, Select, MenuItem
} from '@mui/material';
import { Navigate } from 'react-router-dom';
import useProductVariationFormVM from './useProductVariationFormVM';

const VARIATION_TYPES = [
    { value: 'eBook', label: 'eBook' },
    { value: 'Hub', label: 'Hub' },
    { value: 'Printed', label: 'Printed' },
    { value: 'Marking', label: 'Marking' },
    { value: 'Tutorial', label: 'Tutorial' },
];

const AdminProductVariationForm: React.FC = () => {
    const vm = useProductVariationFormVM();

    if (!vm.isSuperuser) return <Navigate to="/" replace />;
    if (vm.loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

    return (
        <Container sx={{ mt: 4 }}>
            <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
                {vm.isEditMode ? 'Edit Product Variation' : 'Create Product Variation'}
            </Typography>

            {vm.error && <Alert severity="error" sx={{ mb: 3 }}>{vm.error}</Alert>}

            <Box component="form" onSubmit={vm.handleSubmit}>
                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Variation Type</FormLabel>
                    <Select
                        name="variation_type"
                        value={vm.formData.variation_type}
                        onChange={vm.handleChange as any}
                        required
                        displayEmpty
                    >
                        <MenuItem value="" disabled>Select a variation type</MenuItem>
                        {VARIATION_TYPES.map(type => (
                            <MenuItem key={type.value} value={type.value}>
                                {type.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Name</FormLabel>
                    <TextField
                        name="name"
                        value={vm.formData.name}
                        onChange={vm.handleChange}
                        required
                        fullWidth
                        placeholder="Enter variation name"
                    />
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Description</FormLabel>
                    <TextField
                        name="description"
                        value={vm.formData.description}
                        onChange={vm.handleChange}
                        multiline
                        rows={3}
                        fullWidth
                        placeholder="Enter variation description"
                    />
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Code</FormLabel>
                    <TextField
                        name="code"
                        value={vm.formData.code}
                        onChange={vm.handleChange}
                        fullWidth
                        placeholder="Enter variation code"
                    />
                </FormControl>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="contained" type="submit">
                        {vm.isEditMode ? 'Update' : 'Create'} Product Variation
                    </Button>
                    <Button variant="outlined" onClick={vm.handleCancel}>
                        Cancel
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default AdminProductVariationForm;
