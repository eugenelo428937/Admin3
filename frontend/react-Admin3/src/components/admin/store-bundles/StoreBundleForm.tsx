import React from 'react';
import {
  TextField, Button, Container, Alert, Box, Typography,
  FormControl, FormLabel, Checkbox, FormControlLabel,
  Select, MenuItem, CircularProgress
} from '@mui/material';
import { Navigate } from 'react-router-dom';
import useStoreBundleFormVM from './useStoreBundleFormVM';

const AdminStoreBundleForm: React.FC = () => {
    const vm = useStoreBundleFormVM();

    if (!vm.isSuperuser) return <Navigate to="/" replace />;
    if (vm.loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

    return (
        <Container sx={{ mt: 4 }}>
            <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
                {vm.isEditMode ? 'Edit Store Bundle' : 'Add New Store Bundle'}
            </Typography>

            {vm.error && <Alert severity="error" sx={{ mb: 3 }}>{vm.error}</Alert>}

            <Box component="form" onSubmit={vm.handleSubmit}>
                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Bundle Template</FormLabel>
                    <Select
                        name="bundle_template"
                        value={vm.formData.bundle_template}
                        onChange={vm.handleChange as any}
                        displayEmpty
                        fullWidth
                    >
                        <MenuItem value="" disabled>Select a bundle template</MenuItem>
                        {vm.bundleTemplates.map((template) => (
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
                        value={vm.formData.exam_session_subject}
                        onChange={vm.handleChange as any}
                        displayEmpty
                        fullWidth
                    >
                        <MenuItem value="" disabled>Select an exam session subject</MenuItem>
                        {vm.examSessionSubjects.map((ess) => (
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
                        value={vm.formData.override_name}
                        onChange={vm.handleChange}
                        fullWidth
                        helperText="Leave blank to use the default bundle template name"
                    />
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <FormLabel>Override Description</FormLabel>
                    <TextField
                        name="override_description"
                        value={vm.formData.override_description}
                        onChange={vm.handleChange}
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
                                checked={vm.formData.is_active}
                                onChange={vm.handleChange}
                            />
                        }
                        label="Is Active"
                    />
                </FormControl>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="contained" type="submit">
                        {vm.isEditMode ? 'Update Store Bundle' : 'Create Store Bundle'}
                    </Button>
                    <Button variant="outlined" onClick={vm.handleCancel}>
                        Cancel
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default AdminStoreBundleForm;
