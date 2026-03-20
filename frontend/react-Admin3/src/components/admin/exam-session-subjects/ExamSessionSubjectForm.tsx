import React from 'react';
import {
    Button, Container, Alert, Box, Typography,
    FormControl, FormLabel, Checkbox, FormControlLabel, CircularProgress,
    Select, MenuItem,
} from '@mui/material';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.tsx';
import useExamSessionSubjectFormVM from './useExamSessionSubjectFormVM';

const AdminExamSessionSubjectForm: React.FC = () => {
    const { isSuperuser } = useAuth();
    const vm = useExamSessionSubjectFormVM();

    if (!isSuperuser) return <Navigate to="/" replace />;
    if (vm.loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

    return (
        <Container sx={{ mt: 4 }}>
            <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
                {vm.isEditMode ? 'Edit Exam Session Subject' : 'Create Exam Session Subject'}
            </Typography>

            {vm.error && <Alert severity="error" sx={{ mb: 3 }}>{vm.error}</Alert>}

            <Box component="form" onSubmit={vm.handleSubmit}>
                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Exam Session</FormLabel>
                    <Select
                        name="exam_session"
                        value={String(vm.formData.exam_session)}
                        onChange={vm.handleSelectChange}
                        required
                        displayEmpty
                        disabled={vm.isSubmitting}
                    >
                        <MenuItem value="" disabled>Select an exam session</MenuItem>
                        {vm.examSessions.map(session => (
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
                        value={String(vm.formData.subject)}
                        onChange={vm.handleSelectChange}
                        required
                        displayEmpty
                        disabled={vm.isSubmitting}
                    >
                        <MenuItem value="" disabled>Select a subject</MenuItem>
                        {vm.subjects.map(subject => (
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
                                checked={vm.formData.is_active}
                                onChange={vm.handleCheckboxChange}
                                disabled={vm.isSubmitting}
                            />
                        }
                        label="Active"
                    />
                </FormControl>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="contained" type="submit" disabled={vm.isSubmitting}>
                        {vm.isSubmitting ? 'Saving...' : vm.isEditMode ? 'Update' : 'Create'} Exam Session Subject
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={vm.handleCancel}
                        disabled={vm.isSubmitting}
                    >
                        Cancel
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default AdminExamSessionSubjectForm;
