// src/components/admin/store-bundles/StoreBundleForm.js
import React, { useState, useEffect } from 'react';
import {
  TextField, Button, Container, Alert, Box, Typography,
  FormControl, FormLabel, Checkbox, FormControlLabel,
  Select, MenuItem, CircularProgress
} from '@mui/material';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.tsx';
import storeBundleService from '../../../services/storeBundleService.js';
import catalogBundleService from '../../../services/catalogBundleService.js';
import examSessionSubjectService from '../../../services/examSessionSubjectService.js';

const AdminStoreBundleForm = () => {
    const { isSuperuser } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        bundle_template: '',
        exam_session_subject: '',
        override_name: '',
        override_description: '',
        is_active: true
    });

    const [bundleTemplates, setBundleTemplates] = useState([]);
    const [examSessionSubjects, setExamSessionSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDropdownData = async () => {
            try {
                const [templatesData, essData] = await Promise.all([
                    catalogBundleService.getAll(),
                    examSessionSubjectService.getAll()
                ]);
                setBundleTemplates(Array.isArray(templatesData) ? templatesData : []);
                setExamSessionSubjects(Array.isArray(essData) ? essData : []);
            } catch (err) {
                console.error('Error fetching dropdown data:', err);
                setError('Failed to load dropdown options.');
            }
        };

        const fetchStoreBundle = async () => {
            try {
                const data = await storeBundleService.getById(id);
                setFormData({
                    bundle_template: data.bundle_template?.id || data.bundle_template || '',
                    exam_session_subject: data.exam_session_subject?.id || data.exam_session_subject || '',
                    override_name: data.override_name || '',
                    override_description: data.override_description || '',
                    is_active: data.is_active !== undefined ? data.is_active : true
                });
            } catch (err) {
                setError('Failed to load store bundle data.');
                console.error(err);
            }
        };

        const init = async () => {
            await fetchDropdownData();
            if (isEditMode) {
                await fetchStoreBundle();
            }
            setLoading(false);
        };

        init();
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

        if (!formData.bundle_template || !formData.exam_session_subject) {
            setError('Please select both a bundle template and an exam session subject.');
            return;
        }

        try {
            const submitData = {
                bundle_template: formData.bundle_template,
                exam_session_subject: formData.exam_session_subject,
                override_name: formData.override_name,
                override_description: formData.override_description,
                is_active: formData.is_active
            };

            if (isEditMode) {
                await storeBundleService.update(id, submitData);
            } else {
                await storeBundleService.create(submitData);
            }
            navigate('/admin/store-bundles');
        } catch (err) {
            setError(`Failed to ${isEditMode ? 'update' : 'create'} store bundle: ${err.response?.data?.message || err.message}`);
            console.error(err);
        }
    };

    if (!isSuperuser) return <Navigate to="/" replace />;
    if (loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

    return (
        <Container sx={{ mt: 4 }}>
            <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
                {isEditMode ? 'Edit Store Bundle' : 'Add New Store Bundle'}
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit}>
                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Bundle Template</FormLabel>
                    <Select
                        name="bundle_template"
                        value={formData.bundle_template}
                        onChange={handleChange}
                        displayEmpty
                        fullWidth
                    >
                        <MenuItem value="" disabled>Select a bundle template</MenuItem>
                        {bundleTemplates.map((template) => (
                            <MenuItem key={template.id} value={template.id}>
                                {template.name || template.code || `Bundle Template ID: ${template.id}`}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Exam Session Subject</FormLabel>
                    <Select
                        name="exam_session_subject"
                        value={formData.exam_session_subject}
                        onChange={handleChange}
                        displayEmpty
                        fullWidth
                    >
                        <MenuItem value="" disabled>Select an exam session subject</MenuItem>
                        {examSessionSubjects.map((ess) => (
                            <MenuItem key={ess.id} value={ess.id}>
                                {ess.subject_code || ess.subject?.code || ''} - {ess.session_code || ess.exam_session?.session_code || ''} (ID: {ess.id})
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Override Name</FormLabel>
                    <TextField
                        name="override_name"
                        value={formData.override_name}
                        onChange={handleChange}
                        fullWidth
                        helperText="Leave blank to use the default bundle template name"
                    />
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Override Description</FormLabel>
                    <TextField
                        name="override_description"
                        value={formData.override_description}
                        onChange={handleChange}
                        multiline
                        rows={3}
                        fullWidth
                        helperText="Leave blank to use the default bundle template description"
                    />
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
                        label="Is Active"
                    />
                </FormControl>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="contained" type="submit">
                        {isEditMode ? 'Update Store Bundle' : 'Create Store Bundle'}
                    </Button>
                    <Button variant="outlined" onClick={() => navigate('/admin/store-bundles')}>
                        Cancel
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default AdminStoreBundleForm;
