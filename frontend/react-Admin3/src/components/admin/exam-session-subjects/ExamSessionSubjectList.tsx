import React from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Button, Container, Alert, Paper, Typography, Box, CircularProgress,
    FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.tsx';
import useExamSessionSubjectListVM from './useExamSessionSubjectListVM';

const AdminExamSessionSubjectList: React.FC = () => {
    const { isSuperuser } = useAuth();
    const vm = useExamSessionSubjectListVM();

    if (!isSuperuser) return <Navigate to="/" replace />;
    if (vm.loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

    return (
        <Container sx={{ mt: 4 }}>
            <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
                Exam Session Subjects
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
                <Button component={Link} to="/admin/exam-session-subjects/new" variant="contained">
                    Create New Exam Session Subject
                </Button>
                <FormControl sx={{ minWidth: 200 }} size="small">
                    <InputLabel id="exam-session-filter-label">Exam Session</InputLabel>
                    <Select
                        labelId="exam-session-filter-label"
                        value={vm.selectedExamSession}
                        label="Exam Session"
                        onChange={vm.handleExamSessionFilterChange}
                    >
                        <MenuItem value="">All Exam Sessions</MenuItem>
                        {vm.examSessions.map(es => (
                            <MenuItem key={es.id} value={es.id}>{es.session_code}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {vm.error && <Alert severity="error" sx={{ mb: 3 }}>{vm.error}</Alert>}

            {vm.examSessionSubjects.length === 0 && !vm.error ? (
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
                            {Array.isArray(vm.examSessionSubjects) && vm.examSessionSubjects.map(ess => (
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
                                                onClick={() => vm.handleDelete(ess.id)}
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
