import React from 'react';
import { Navigate } from 'react-router-dom';
import {
    TextField, Button, Container, Alert, Box, Typography,
    FormControl, FormLabel, Checkbox, FormControlLabel,
    Select, MenuItem, CircularProgress,
} from '@mui/material';
import useStoreProductFormVM from './useStoreProductFormVM';

const AdminStoreProductForm: React.FC = () => {
    const vm = useStoreProductFormVM();

    if (!vm.isSuperuser) return <Navigate to="/" replace />;
    if (vm.loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

    return (
        <Container sx={{ mt: 4 }}>
            <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
                {vm.isEditMode ? 'Edit Store Product' : 'Add New Store Product'}
            </Typography>

            {vm.error && <Alert severity="error" sx={{ mb: 3 }}>{vm.error}</Alert>}

            <Box component="form" onSubmit={vm.handleSubmit}>
                {vm.isEditMode && vm.formData.product_code && (
                    <FormControl fullWidth sx={{ mb: 3 }}>
                        <FormLabel>Product Code</FormLabel>
                        <TextField
                            name="product_code"
                            value={vm.formData.product_code}
                            fullWidth
                            disabled
                            helperText="Product code is auto-generated and cannot be changed"
                        />
                    </FormControl>
                )}

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Exam Session Subject</FormLabel>
                    <Select
                        name="exam_session_subject"
                        value={vm.formData.exam_session_subject}
                        onChange={vm.handleChange as any}
                        displayEmpty
                        fullWidth
                    >
                        <MenuItem value="" disabled>Select an exam session subject</MenuItem>
                        {vm.examSessionSubjects.map((ess: any) => (
                            <MenuItem key={ess.id} value={ess.id}>
                                {ess.subject_code || ess.subject?.code || ''} - {ess.session_code || ess.exam_session?.session_code || ''} (ID: {ess.id})
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Product Product Variation</FormLabel>
                    <Select
                        name="product_product_variation"
                        value={vm.formData.product_product_variation}
                        onChange={vm.handleChange as any}
                        displayEmpty
                        fullWidth
                    >
                        <MenuItem value="" disabled>Select a product product variation</MenuItem>
                        {vm.productProductVariations.map((ppv: any) => (
                            <MenuItem key={ppv.id} value={ppv.id}>
                                {ppv.product_code || ppv.product?.code || ''} - {ppv.variation_code || ppv.product_variation?.code || ''} (ID: {ppv.id})
                            </MenuItem>
                        ))}
                    </Select>
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
                        label="Is Active"
                    />
                </FormControl>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="contained" type="submit">
                        {vm.isEditMode ? 'Update Store Product' : 'Create Store Product'}
                    </Button>
                    <Button variant="outlined" onClick={vm.handleCancel}>
                        Cancel
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default AdminStoreProductForm;
