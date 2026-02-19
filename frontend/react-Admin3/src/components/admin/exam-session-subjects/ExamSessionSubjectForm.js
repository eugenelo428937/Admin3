// src/components/admin/exam-session-subjects/ExamSessionSubjectForm.js
import React, { useState, useEffect } from 'react';
import {
  TextField, Button, Container, Alert, Box, Typography,
  FormControl, FormLabel, Checkbox, FormControlLabel, CircularProgress,
  Select, MenuItem
} from '@mui/material';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import examSessionSubjectService from '../../../services/examSessionSubjectService';
import examSessionService from '../../../services/examSessionService';
import subjectService from '../../../services/subjectService';

const AdminExamSessionSubjectForm = () => {
    const { isSuperuser } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        exam_session: '',
        subject: '',
        is_active: true
    });

    const [examSessions, setExamSessions] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDropdownData = async () => {
            try {
                const [examSessionsData, subjectsData] = await Promise.all([
                    examSessionService.getAll(),
                    subjectService.getAll()
                ]);
                setExamSessions(Array.isArray(examSessionsData) ? examSessionsData : []);
                setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
            } catch (err) {
                console.error('Error fetching dropdown data:', err);
                setError('Failed to load dropdown data. Please try again.');
            }
        };

        const fetchExamSessionSubject = async () => {
            try {
                const data = await examSessionSubjectService.getById(id);
                setFormData({
                    exam_session: data.exam_session?.id || data.exam_session || '',
                    subject: data.subject?.id || data.subject || '',
                    is_active: data.is_active !== undefined ? data.is_active : true
                });
            } catch (err) {
                setError('Failed to fetch exam session subject details. Please try again.');
            }
        };

        const initializeForm = async () => {
            await fetchDropdownData();
            if (isEditMode) {
                await fetchExamSessionSubject();
            }
            setLoading(false);
        };

        initializeForm();
    }, [id, isEditMode]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.exam_session || !formData.subject) {
            setError('Please select both an exam session and a subject.');
            return;
        }

        try {
            if (isEditMode) {
                await examSessionSubjectService.update(id, formData);
            } else {
                await examSessionSubjectService.create(formData);
            }
            navigate('/admin/exam-session-subjects');
        } catch (err) {
            setError(`Failed to ${isEditMode ? 'update' : 'create'} exam session subject. Please check your input and try again.`);
        }
    };

    if (!isSuperuser) return <Navigate to="/" replace />;
    if (loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

    return (
        <Container sx={{ mt: 4 }}>
            <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
                {isEditMode ? 'Edit Exam Session Subject' : 'Create Exam Session Subject'}
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit}>
                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Exam Session</FormLabel>
                    <Select
                        name="exam_session"
                        value={formData.exam_session}
                        onChange={handleChange}
                        required
                        displayEmpty
                    >
                        <MenuItem value="" disabled>Select an exam session</MenuItem>
                        {examSessions.map(session => (
                            <MenuItem key={session.id} value={session.id}>
                                {session.session_code}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Subject</FormLabel>
                    <Select
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        displayEmpty
                    >
                        <MenuItem value="" disabled>Select a subject</MenuItem>
                        {subjects.map(subject => (
                            <MenuItem key={subject.id} value={subject.id}>
                                {subject.code}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                name="is_active"
                                checked={formData.is_active}
                                onChange={handleChange}
                            />
                        }
                        label="Active"
                    />
                </FormControl>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="contained" type="submit">
                        {isEditMode ? 'Update' : 'Create'} Exam Session Subject
                    </Button>
                    <Button variant="outlined" onClick={() => navigate('/admin/exam-session-subjects')}>
                        Cancel
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default AdminExamSessionSubjectForm;
