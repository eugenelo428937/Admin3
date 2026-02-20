import React from 'react';
import {
    Container, Typography, Box, TextField, Button, Paper,
    CircularProgress, Alert, MenuItem, FormControlLabel, Checkbox,
} from '@mui/material';
import {
    Save as SaveIcon,
    Cancel as CancelIcon,
} from '@mui/icons-material';
import useClosingSalutationFormVM from './useClosingSalutationFormVM';
import type { SignatureType, StaffNameFormat } from '../../../../types/email';

const SIGNATURE_TYPES: { value: SignatureType; label: string }[] = [
    { value: 'team', label: 'Team' },
    { value: 'staff', label: 'Staff' },
];

const STAFF_NAME_FORMATS: { value: StaffNameFormat; label: string }[] = [
    { value: 'full_name', label: 'Full Name' },
    { value: 'first_name', label: 'First Name Only' },
];

const ClosingSalutationForm: React.FC = () => {
    const vm = useClosingSalutationFormVM();

    if (vm.loading) {
        return (
            <Container maxWidth="md" sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ mt: 2 }}>
            <Typography variant="h5" gutterBottom>
                {vm.isEditMode ? 'Edit Closing Salutation' : 'New Closing Salutation'}
            </Typography>

            {vm.error && <Alert severity="error" sx={{ mb: 2 }}>{vm.error}</Alert>}

            <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        label="Name"
                        value={vm.formData.name}
                        onChange={(e) => vm.handleChange('name', e.target.value)}
                        fullWidth
                        required
                        helperText="Internal identifier (e.g., team_kind_regards)"
                    />

                    <TextField
                        label="Display Name"
                        value={vm.formData.display_name}
                        onChange={(e) => vm.handleChange('display_name', e.target.value)}
                        fullWidth
                        required
                    />

                    <TextField
                        label="Sign-off Text"
                        value={vm.formData.sign_off_text}
                        onChange={(e) => vm.handleChange('sign_off_text', e.target.value)}
                        fullWidth
                        required
                        helperText='The closing phrase (e.g., "Kind Regards", "Best Wishes")'
                    />

                    <TextField
                        label="Signature Type"
                        value={vm.formData.signature_type}
                        onChange={(e) => vm.handleChange('signature_type', e.target.value)}
                        select
                        fullWidth
                        required
                    >
                        {SIGNATURE_TYPES.map(opt => (
                            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                        ))}
                    </TextField>

                    {vm.formData.signature_type === 'team' && (
                        <TextField
                            label="Team Signature"
                            value={vm.formData.team_signature}
                            onChange={(e) => vm.handleChange('team_signature', e.target.value)}
                            fullWidth
                            required
                            helperText='The team name displayed as the signature (e.g., "The ActEd Team")'
                        />
                    )}

                    {vm.formData.signature_type === 'staff' && (
                        <>
                            <TextField
                                label="Staff Name Format"
                                value={vm.formData.staff_name_format}
                                onChange={(e) => vm.handleChange('staff_name_format', e.target.value)}
                                select
                                fullWidth
                                required
                            >
                                {STAFF_NAME_FORMATS.map(opt => (
                                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                ))}
                            </TextField>

                            <Alert severity="info">
                                Staff member selection will be available in a future update.
                            </Alert>
                        </>
                    )}

                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={vm.formData.is_active}
                                onChange={(e) => vm.handleChange('is_active', e.target.checked)}
                            />
                        }
                        label="Active"
                    />

                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                        <Button
                            variant="outlined"
                            startIcon={<CancelIcon />}
                            onClick={vm.handleCancel}
                            disabled={vm.isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={vm.isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
                            onClick={vm.handleSubmit}
                            disabled={vm.isSubmitting}
                        >
                            {vm.isSubmitting ? 'Saving...' : 'Save'}
                        </Button>
                    </Box>
                </Box>
            </Paper>
        </Container>
    );
};

export default ClosingSalutationForm;
