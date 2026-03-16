// src/components/admin/recommendations/RecommendationList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Container, Alert, Paper, Typography, Box, CircularProgress, TablePagination
} from '@mui/material';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.tsx';
import recommendationService from '../../../services/recommendationService.js';

const AdminRecommendationList = () => {
    const { isSuperuser } = useAuth();
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [totalCount, setTotalCount] = useState(0);

    const fetchRecommendations = useCallback(async () => {
        try {
            setLoading(true);
            const { results, count } = await recommendationService.list({
                page: page + 1,
                page_size: rowsPerPage,
            });
            setRecommendations(results);
            setTotalCount(count);
            setError(null);
        } catch (err) {
            console.error('Error fetching recommendations:', err);
            setError('Failed to fetch recommendations. Please try again later.');
            setRecommendations([]);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage]);

    useEffect(() => {
        fetchRecommendations();
    }, [fetchRecommendations]);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this recommendation?')) {
            try {
                await recommendationService.delete(id);
                fetchRecommendations();
            } catch (err) {
                setError('Failed to delete recommendation. Please try again later.');
            }
        }
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    if (!isSuperuser) return <Navigate to="/" replace />;
    if (loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

    return (
        <Container sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" component="h2">Recommendations</Typography>
                <Button component={Link} to="/admin/recommendations/new" variant="contained">
                    Add New Recommendation
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {recommendations.length === 0 && !error ? (
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
                            {recommendations.map((rec) => (
                                <TableRow key={rec.id} hover>
                                    <TableCell>{rec.id}</TableCell>
                                    <TableCell>
                                        {rec.source_product_code && rec.source_variation_name
                                            ? `${rec.source_product_code} — ${rec.source_variation_name}`
                                            : rec.product_product_variation || ''}
                                    </TableCell>
                                    <TableCell>
                                        {rec.recommended_product_code && rec.recommended_variation_name
                                            ? `${rec.recommended_product_code} — ${rec.recommended_variation_name}`
                                            : rec.recommended_product_product_variation || ''}
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
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
                                                onClick={() => handleDelete(rec.id)}
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
            {totalCount > rowsPerPage && (
                <TablePagination
                    component="div"
                    count={totalCount}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[25, 50, 100]}
                />
            )}
        </Container>
    );
};

export default AdminRecommendationList;
