import React from "react";
import {
    Button,
    Container,
    Alert,
    Box,
    Typography,
    FormControl,
    FormLabel,
    Select,
    MenuItem,
    CircularProgress,
} from "@mui/material";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth.tsx";
import useRecommendationFormVM from "./useRecommendationFormVM";

const AdminRecommendationForm = () => {
    const { isSuperuser } = useAuth();
    const vm = useRecommendationFormVM();

    if (!isSuperuser) return <Navigate to="/" replace />;
    if (vm.loading)
        return (
            <Box sx={{ textAlign: "center", mt: 5 }}>
                <CircularProgress />
            </Box>
        );

    return (
        <Container sx={{ mt: 4 }}>
            <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
                {vm.isEditMode ? "Edit Recommendation" : "Add New Recommendation"}
            </Typography>

            {vm.error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {vm.error}
                </Alert>
            )}

            <Box component="form" onSubmit={vm.handleSubmit}>
                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Source Product Product Variation</FormLabel>
                    <Select
                        name="source_ppv"
                        value={vm.formData.source_ppv}
                        onChange={vm.handleChange}
                        displayEmpty
                        fullWidth
                    >
                        <MenuItem value="" disabled>
                            Select a source product product variation
                        </MenuItem>
                        {vm.productProductVariations.map((ppv) => (
                            <MenuItem key={ppv.id} value={String(ppv.id)}>
                                {ppv.product_code || ppv.product?.code || ""} -{" "}
                                {ppv.variation_code || ppv.product_variation?.code || ""} (ID:{" "}
                                {ppv.id})
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Recommended Product Product Variation</FormLabel>
                    <Select
                        name="recommended_ppv"
                        value={vm.formData.recommended_ppv}
                        onChange={vm.handleChange}
                        displayEmpty
                        fullWidth
                    >
                        <MenuItem value="" disabled>
                            Select a recommended product product variation
                        </MenuItem>
                        {vm.productProductVariations.map((ppv) => (
                            <MenuItem key={ppv.id} value={String(ppv.id)}>
                                {ppv.product_code || ppv.product?.code || ""} -{" "}
                                {ppv.variation_code || ppv.product_variation?.code || ""} (ID:{" "}
                                {ppv.id})
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Box sx={{ display: "flex", gap: 2 }}>
                    <Button variant="contained" type="submit">
                        {vm.isEditMode ? "Update Recommendation" : "Create Recommendation"}
                    </Button>
                    <Button variant="outlined" onClick={vm.handleCancel}>
                        Cancel
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default AdminRecommendationForm;
