import React from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Container, Alert, Paper, Typography, Box, CircularProgress, TablePagination
} from '@mui/material';
import { Link, Navigate } from 'react-router-dom';
import moment from 'moment';
import useExamSessionListVM from './useExamSessionListVM';

const AdminExamSessionList: React.FC = () => {
    const vm = useExamSessionListVM();

    if (!vm.isSuperuser) return <Navigate to="/" replace />;
    if (vm.loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

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

            {vm.error && <Alert severity="error" sx={{ mb: 3 }}>{vm.error}</Alert>}

            {vm.examSessions.length === 0 && !vm.error ? (
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
                            {Array.isArray(vm.examSessions) && vm.examSessions.map(session => (
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
                                                onClick={() => vm.handleDelete(session.id)}
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

export default AdminExamSessionList;
