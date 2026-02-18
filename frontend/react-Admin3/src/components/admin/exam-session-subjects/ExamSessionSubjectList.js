// src/components/admin/exam-session-subjects/ExamSessionSubjectList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Container, Alert, Paper, Typography, Box, CircularProgress,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import examSessionSubjectService from '../../../services/examSessionSubjectService';
import examSessionService from '../../../services/examSessionService';

const AdminExamSessionSubjectList = () => {
    const { isSuperuser } = useAuth();
    const [examSessionSubjects, setExamSessionSubjects] = useState([]);
    const [examSessions, setExamSessions] = useState([]);
    const [selectedExamSession, setSelectedExamSession] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        examSessionService.getAll().then(data => {
            setExamSessions(Array.isArray(data) ? data : []);
        });
    }, []);

    const fetchExamSessionSubjects = useCallback(async () => {
        try {
            setLoading(true);
            const params = {};
            if (selectedExamSession) {
                params.exam_session = selectedExamSession;
            }
            const data = await examSessionSubjectService.getAll(params);
            if (Array.isArray(data)) {
                setExamSessionSubjects(data);
            } else if (data && data.results && Array.isArray(data.results)) {
                setExamSessionSubjects(data.results);
            } else if (data && typeof data === 'object') {
                setExamSessionSubjects(Object.values(data));
            } else {
                setExamSessionSubjects([]);
                setError('Unexpected data format received from server');
            }
        } catch (err) {
            console.error('Error fetching exam session subjects:', err);
            setError('Failed to fetch exam session subjects. Please try again later.');
            setExamSessionSubjects([]);
        } finally {
            setLoading(false);
        }
    }, [selectedExamSession]);

    useEffect(() => {
        fetchExamSessionSubjects();
    }, [fetchExamSessionSubjects]);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this exam session subject?')) {
            try {
                await examSessionSubjectService.delete(id);
                setExamSessionSubjects(examSessionSubjects.filter(ess => ess.id !== id));
            } catch (err) {
                setError('Failed to delete exam session subject. Please try again later.');
            }
        }
    };

    if (!isSuperuser) return <Navigate to="/" replace />;
    if (loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

    return (
        <Container sx={{ mt: 4 }}>
            <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
                Exam Session Subjects
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
                <Button
                    component={Link}
                    to="/admin/exam-session-subjects/new"
                    variant="contained"
                >
                    Create New Exam Session Subject
                </Button>

                <FormControl sx={{ minWidth: 200 }} size="small">
                    <InputLabel id="exam-session-filter-label">Exam Session</InputLabel>
                    <Select
                        labelId="exam-session-filter-label"
                        value={selectedExamSession}
                        label="Exam Session"
                        onChange={(e) => setSelectedExamSession(e.target.value)}
                    >
                        <MenuItem value="">All Exam Sessions</MenuItem>
                        {examSessions.map(es => (
                            <MenuItem key={es.id} value={es.id}>
                                {es.session_code}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {examSessionSubjects.length === 0 && !error ? (
                <Alert severity="info">No exam session subjects found.</Alert>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Exam Session</TableCell>
                                <TableCell>Subject</TableCell>
                                <TableCell>Active</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {Array.isArray(examSessionSubjects) && examSessionSubjects.map(ess => (
                                <TableRow key={ess.id} hover>
                                    <TableCell>{ess.id}</TableCell>
                                    <TableCell>{ess.exam_session?.session_code || '-'}</TableCell>
                                    <TableCell>{ess.subject?.code || '-'}</TableCell>
                                    <TableCell>{ess.is_active ? 'Active' : 'Inactive'}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Button
                                                component={Link}
                                                to={`/admin/exam-session-subjects/${ess.id}/edit`}
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
                                                onClick={() => handleDelete(ess.id)}
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
        </Container>
    );
};

export default AdminExamSessionSubjectList;
