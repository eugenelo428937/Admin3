import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
    AdminPage,
    AdminPageHeader,
    AdminDataTable,
    AdminErrorAlert,
} from "@/components/admin/composed";
import { useAuth } from "../../../hooks/useAuth.tsx";
import useRecommendationListVM from "./useRecommendationListVM";

const AdminRecommendationList = () => {
    const { isSuperuser } = useAuth();
    const vm = useRecommendationListVM();
    const navigate = useNavigate();

    if (!isSuperuser) return <Navigate to="/" replace />;

    return (
        <AdminPage>
            <AdminPageHeader
                title="Recommendations"
                actions={[
                    {
                        label: "Add New Recommendation",
                        icon: Plus,
                        onClick: () => navigate("/admin/recommendations/new"),
                    },
                ]}
            />
            <AdminErrorAlert message={vm.error} />
            <AdminDataTable
                columns={[
                    { key: "id", header: "ID" },
                    {
                        key: "source_ppv_label",
                        header: "Source PPV",
                        render: (_val, row) =>
                            row.source_product_code && row.source_variation_name
                                ? `${row.source_product_code} — ${row.source_variation_name}`
                                : String(row.product_product_variation ?? ""),
                    },
                    {
                        key: "recommended_ppv_label",
                        header: "Recommended PPV",
                        render: (_val, row) =>
                            row.recommended_product_code && row.recommended_variation_name
                                ? `${row.recommended_product_code} — ${row.recommended_variation_name}`
                                : String(row.recommended_product_product_variation ?? ""),
                    },
                ]}
                data={vm.recommendations}
                loading={vm.loading}
                emptyMessage="No recommendations found"
                pagination={{
                    page: vm.page,
                    pageSize: vm.rowsPerPage,
                    total: vm.totalCount,
                    onPageChange: vm.handleChangePage,
                    onPageSizeChange: vm.handleChangeRowsPerPage,
                    pageSizeOptions: [25, 50, 100],
                }}
                actions={(row) => [
                    {
                        label: "Edit",
                        icon: Pencil,
                        onClick: () => navigate(`/admin/recommendations/${row.id}/edit`),
                    },
                    {
                        label: "Delete",
                        icon: Trash2,
                        variant: "destructive" as const,
                        onClick: () => vm.handleDelete(row.id),
                    },
                ]}
            />
        </AdminPage>
    );
};

export default AdminRecommendationList;
