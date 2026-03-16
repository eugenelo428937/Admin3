import React from 'react';
import { Navigate } from 'react-router-dom';
import {
    TextField, Button, Container, Alert, Box, Typography,
    FormControl, FormLabel, Checkbox, FormControlLabel, CircularProgress,
} from '@mui/material';
import useProductFormVM from './useProductFormVM';

const AdminProductForm: React.FC = () => {
    const vm = useProductFormVM();

    if (!vm.isSuperuser) return <Navigate to="/" replace />;
    if (vm.loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

    return (
        <Container sx={{ mt: 4 }}>
            <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
                {vm.isEditMode ? 'Edit Product' : 'Add New Product'}
            </Typography>

            {vm.error && <Alert severity="error" sx={{ mb: 3 }}>{vm.error}</Alert>}

            <Box component="form" onSubmit={vm.handleSubmit}>
                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Code</FormLabel>
                    <TextField
                        name="code"
                        value={vm.formData.code}
                        onChange={vm.handleChange}
                        required
                        inputProps={{ maxLength: 10 }}
                        disabled={vm.isEditMode}
                        fullWidth
                        helperText={vm.isEditMode ? 'Codes cannot be changed after creation' : ''}
                    />
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Full Name</FormLabel>
                    <TextField name="fullname" value={vm.formData.fullname} onChange={vm.handleChange} required fullWidth />
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Short Name</FormLabel>
                    <TextField name="shortname" value={vm.formData.shortname} onChange={vm.handleChange} required inputProps={{ maxLength: 20 }} fullWidth />
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Description</FormLabel>
                    <TextField multiline rows={3} name="description" value={vm.formData.description} onChange={vm.handleChange} fullWidth />
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormControlLabel
                        control={<Checkbox name="active" checked={vm.formData.active} onChange={vm.handleChange} />}
                        label="Active"
                    />
                </FormControl>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="contained" type="submit">
                        {vm.isEditMode ? 'Update Product' : 'Create Product'}
                    </Button>
                    <Button variant="outlined" onClick={vm.handleCancel}>
                        Cancel
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default AdminProductForm;
