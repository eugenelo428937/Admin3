import React from 'react';
import {
    TextField, Button, Container, Alert, Box, Typography,
    FormControl, FormLabel, Checkbox, FormControlLabel, CircularProgress,
    Select, MenuItem
} from '@mui/material';
import { Navigate } from 'react-router-dom';
import useProductBundleFormVM from './useProductBundleFormVM';

const AdminProductBundleForm: React.FC = () => {
    const vm = useProductBundleFormVM();

    if (!vm.isSuperuser) return <Navigate to="/" replace />;
    if (vm.loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

    return (
        <Container sx={{ mt: 4 }}>
            <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
                {vm.isEditMode ? 'Edit Product Bundle' : 'Create Product Bundle'}
            </Typography>

            {vm.error && <Alert severity="error" sx={{ mb: 3 }}>{vm.error}</Alert>}

            <Box component="form" onSubmit={vm.handleSubmit}>
                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Bundle Name</FormLabel>
                    <TextField
                        name="bundle_name"
                        value={vm.formData.bundle_name}
                        onChange={vm.handleChange}
                        required
                        fullWidth
                        placeholder="Enter bundle name"
                    />
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Subject</FormLabel>
                    <Select
                        name="subject"
                        value={vm.formData.subject}
                        onChange={(e) => vm.handleChange(e as React.ChangeEvent<HTMLInputElement>)}
                        displayEmpty
                    >
                        <MenuItem value="" disabled>Select a subject</MenuItem>
                        {vm.subjects.map(subject => (
                            <MenuItem key={subject.id} value={subject.id}>
                                {subject.code}
                            </MenuItem>
                        ))}
                    </Select>
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
                        placeholder="Enter bundle description"
                    />
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                name="is_featured"
                                checked={vm.formData.is_featured}
                                onChange={vm.handleChange}
                            />
                        }
                        label="Featured"
                    />
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                name="is_active"
                                checked={vm.formData.is_active}
                                onChange={vm.handleChange}
                            />
                        }
                        label="Active"
                    />
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Display Order</FormLabel>
                    <TextField
                        name="display_order"
                        type="number"
                        value={vm.formData.display_order}
                        onChange={vm.handleChange}
                        fullWidth
                        placeholder="Enter display order"
                        inputProps={{ min: 0 }}
                    />
                </FormControl>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="contained" type="submit">
                        {vm.isEditMode ? 'Update' : 'Create'} Product Bundle
                    </Button>
                    <Button variant="outlined" onClick={vm.handleCancel}>
                        Cancel
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default AdminProductBundleForm;
