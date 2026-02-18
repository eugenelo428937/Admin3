// src/components/admin/exam-sessions/ExamSessionList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Container, Alert, Paper, Typography, Box, CircularProgress, TablePagination
} from '@mui/material';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import examSessionService from '../../../services/examSessionService';
import moment from 'moment';

const AdminExamSessionList = () => {
    const { isSuperuser } = useAuth();
    const [examSessions, setExamSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [totalCount, setTotalCount] = useState(0);

    const fetchExamSessions = useCallback(async () => {
        try {
            setLoading(true);
            const { results, count } = await examSessionService.list({
                page: page + 1,
                page_size: rowsPerPage,
            });
            setExamSessions(results);
            setTotalCount(count);
            setError(null);
        } catch (err) {
            console.error('Error fetching exam sessions:', err);
            setError('Failed to fetch exam sessions');
            setExamSessions([]);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage]);

    useEffect(() => {
        fetchExamSessions();
    }, [fetchExamSessions]);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this exam session?')) {
            try {
                await examSessionService.delete(id);
                fetchExamSessions();
            } catch (err) {
                setError('Failed to delete exam session');
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
            <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
                Exam Sessions
            </Typography>

            <Button
                component={Link}
                to="/admin/exam-sessions/new"
                variant="contained"
                sx={{ mb: 3 }}
            >
                Create New Exam Session
            </Button>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {examSessions.length === 0 && !error ? (
                <Alert severity="info">No exam sessions found.</Alert>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Session Code</TableCell>
                                <TableCell>Start Date</TableCell>
                                <TableCell>End Date</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {Array.isArray(examSessions) && examSessions.map(session => (
                                <TableRow key={session.id} hover>
                                    <TableCell>{session.session_code}</TableCell>
                                    <TableCell>{moment(session.start_date).format('YYYY-MM-DD HH:mm')}</TableCell>
                                    <TableCell>{moment(session.end_date).format('YYYY-MM-DD HH:mm')}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Button
                                                component={Link}
                                                to={`/admin/exam-sessions/${session.id}/edit`}
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
                                                onClick={() => handleDelete(session.id)}
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

export default AdminExamSessionList;
