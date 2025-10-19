// src/components/ExamSessionList.js
import React, { useState, useEffect } from 'react';
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
  Box
} from '@mui/material';
import { Link } from 'react-router-dom';
import examSessionService from '../../../services/examSessionService';
import moment from 'moment';

const AdminExamSessionList = () => {
    const [examSessions, setExamSessions] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchExamSessions();
    }, []);

    const fetchExamSessions = async () => {
        try {
            const data = await examSessionService.getAll();
            setExamSessions(data);
        } catch (err) {
            console.error('Error fetching exam sessions:', err);
            setError('Failed to fetch exam sessions');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this exam session?')) {
            try {
                await examSessionService.delete(id);
                setExamSessions(examSessions.filter(session => session.id !== id));
            } catch (err) {
                setError('Failed to delete exam session');
            }
        }
    };

    return (
        <Container sx={{ mt: 4 }}>
            <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
                Exam Sessions
            </Typography>

            <Button
                component={Link}
                to="/exam-sessions/new"
                variant="contained"
                sx={{ mb: 3 }}
            >
                Create New Exam Session
            </Button>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

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
                                            to={`/exam-sessions/edit/${session.id}`}
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
        </Container>
    );
};

export default AdminExamSessionList;
