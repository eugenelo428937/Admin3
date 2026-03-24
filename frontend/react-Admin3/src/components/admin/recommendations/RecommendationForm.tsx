import React from "react";
import { Navigate } from "react-router-dom";
import {
    AdminPage,
    AdminFormLayout,
    AdminFormField,
    AdminSelect,
} from "@/components/admin/composed";
import { useAuth } from "../../../hooks/useAuth.tsx";
import useRecommendationFormVM from "./useRecommendationFormVM";

const AdminRecommendationForm = () => {
    const { isSuperuser } = useAuth();
    const vm = useRecommendationFormVM();

    if (!isSuperuser) return <Navigate to="/" replace />;

    const ppvOptions = vm.productProductVariations.map((ppv) => ({
        value: String(ppv.id),
        label: `${ppv.product_code || ppv.product?.code || ""} - ${
            ppv.variation_code || ppv.product_variation?.code || ""
        } (ID: ${ppv.id})`,
    }));

    return (
        <AdminPage>
            <AdminFormLayout
                title={vm.isEditMode ? "Edit Recommendation" : "Add New Recommendation"}
                onSubmit={vm.handleSubmit}
                onCancel={vm.handleCancel}
                loading={vm.loading}
                error={vm.error}
                submitLabel={
                    vm.isEditMode ? "Update Recommendation" : "Create Recommendation"
                }
            >
                <AdminFormField label="Source Product Product Variation" required>
                    <AdminSelect
                        options={ppvOptions}
                        value={vm.formData.source_ppv}
                        onChange={vm.handleSourceChange}
                        placeholder="Select a source product product variation"
                        disabled={vm.loading}
                    />
                </AdminFormField>

                <AdminFormField label="Recommended Product Product Variation" required>
                    <AdminSelect
                        options={ppvOptions}
                        value={vm.formData.recommended_ppv}
                        onChange={vm.handleRecommendedChange}
                        placeholder="Select a recommended product product variation"
                        disabled={vm.loading}
                    />
                </AdminFormField>
            </AdminFormLayout>
        </AdminPage>
    );
};

export default AdminRecommendationForm;
