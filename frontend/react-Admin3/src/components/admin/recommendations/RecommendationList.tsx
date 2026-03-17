import React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Container,
    Alert,
    Paper,
    Typography,
    Box,
    CircularProgress,
    TablePagination,
} from "@mui/material";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth.tsx";
import useRecommendationListVM from "./useRecommendationListVM";

const AdminRecommendationList = () => {
    const { isSuperuser } = useAuth();
    const vm = useRecommendationListVM();

    if (!isSuperuser) return <Navigate to="/" replace />;
    if (vm.loading)
        return (
            <Box sx={{ textAlign: "center", mt: 5 }}>
                <CircularProgress />
            </Box>
        );

    return (
        <Container sx={{ mt: 4 }}>
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 4,
                }}
            >
                <Typography variant="h4" component="h2">
                    Recommendations
                </Typography>
                <Button
                    component={Link}
                    to="/admin/recommendations/new"
                    variant="contained"
                >
                    Add New Recommendation
                </Button>
            </Box>

            {vm.error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {vm.error}
                </Alert>
            )}

            {vm.recommendations.length === 0 && !vm.error ? (
                <Alert severity="info">No recommendations found.</Alert>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Source PPV</TableCell>
                                <TableCell>Recommended PPV</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {vm.recommendations.map((rec) => (
                                <TableRow key={rec.id} hover>
                                    <TableCell>{rec.id}</TableCell>
                                    <TableCell>
                                        {rec.source_product_code && rec.source_variation_name
                                            ? `${rec.source_product_code} — ${rec.source_variation_name}`
                                            : rec.product_product_variation || ""}
                                    </TableCell>
                                    <TableCell>
                                        {rec.recommended_product_code && rec.recommended_variation_name
                                            ? `${rec.recommended_product_code} — ${rec.recommended_variation_name}`
                                            : rec.recommended_product_product_variation || ""}
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: "flex", gap: 1 }}>
                                            <Button
                                                component={Link}
                                                to={`/admin/recommendations/${rec.id}/edit`}
                                                variant="contained"
                                                color="info"
                                                size="small"
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                variant="contained"
                                                color="error"
                                                size="small"
                                                onClick={() => vm.handleDelete(rec.id)}
                                            >
                                                Delete
                                            </Button>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {vm.totalCount > vm.rowsPerPage && (
                <TablePagination
                    component="div"
                    count={vm.totalCount}
                    page={vm.page}
                    onPageChange={vm.handleChangePage}
                    rowsPerPage={vm.rowsPerPage}
                    onRowsPerPageChange={vm.handleChangeRowsPerPage}
                    rowsPerPageOptions={[25, 50, 100]}
                />
            )}
        </Container>
    );
};

export default AdminRecommendationList;
