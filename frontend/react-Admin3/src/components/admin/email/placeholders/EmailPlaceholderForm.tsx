import React from 'react';
import {
    Container, Typography, Box, TextField, Button, Paper,
    CircularProgress, Alert, MenuItem, FormControlLabel, Checkbox,
    Autocomplete, Chip,
} from '@mui/material';
import {
    Save as SaveIcon,
    Cancel as CancelIcon,
} from '@mui/icons-material';
import useEmailPlaceholderFormVM from './useEmailPlaceholderFormVM';
import type { InsertPosition } from '../../../../types/email';

const INSERT_POSITIONS: { value: InsertPosition; label: string }[] = [
    { value: 'replace', label: 'Replace' },
    { value: 'before', label: 'Before' },
    { value: 'after', label: 'After' },
    { value: 'append', label: 'Append' },
    { value: 'prepend', label: 'Prepend' },
];

const EmailPlaceholderForm: React.FC = () => {
    const vm = useEmailPlaceholderFormVM();

    if (vm.loading) {
        return (
            <Container maxWidth="md" sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    // Build selected template objects for Autocomplete
    const selectedTemplates = vm.templates.filter(t => vm.formData.templates.includes(t.id));

    return (
        <Container maxWidth="md" sx={{ mt: 2 }}>
            <Typography variant="h5" gutterBottom>
                {vm.isEditMode ? 'Edit Placeholder' : 'New Placeholder'}
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
                        helperText="Internal identifier (e.g., order_details_block)"
                    />

                    <TextField
                        label="Display Name"
                        value={vm.formData.display_name}
                        onChange={(e) => vm.handleChange('display_name', e.target.value)}
                        fullWidth
                        required
                    />

                    <TextField
                        label="Description"
                        value={vm.formData.description}
                        onChange={(e) => vm.handleChange('description', e.target.value)}
                        fullWidth
                        multiline
                        rows={2}
                    />

                    <TextField
                        label="Default Content Template"
                        value={vm.formData.default_content_template}
                        onChange={(e) => vm.handleChange('default_content_template', e.target.value)}
                        fullWidth
                        multiline
                        rows={4}
                        helperText="Default content when no rule matches. Supports {{variable}} placeholders."
                        InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.875rem' } }}
                    />

                    <TextField
                        label="Content Variables (JSON)"
                        value={vm.formData.content_variables}
                        onChange={(e) => vm.handleChange('content_variables', e.target.value)}
                        fullWidth
                        multiline
                        rows={3}
                        helperText="Define available variables as JSON (e.g., {&quot;order_id&quot;: &quot;string&quot;, &quot;total&quot;: &quot;number&quot;})"
                        InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.875rem' } }}
                    />

                    <TextField
                        label="Insert Position"
                        value={vm.formData.insert_position}
                        onChange={(e) => vm.handleChange('insert_position', e.target.value)}
                        select
                        fullWidth
                        required
                    >
                        {INSERT_POSITIONS.map(opt => (
                            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                        ))}
                    </TextField>

                    <Autocomplete
                        multiple
                        options={vm.templates}
                        getOptionLabel={(option) => option.display_name || option.name}
                        value={selectedTemplates}
                        onChange={(_, newValue) => {
                            vm.handleTemplatesChange(newValue.map(t => t.id));
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Templates"
                                helperText="Select which email templates use this placeholder"
                            />
                        )}
                        renderTags={(tagValue, getTagProps) =>
                            tagValue.map((option, index) => {
                                const { key, ...chipProps } = getTagProps({ index });
                                return (
                                    <Chip
                                        key={key}
                                        label={option.display_name || option.name}
                                        size="small"
                                        {...chipProps}
                                    />
                                );
                            })
                        }
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                    />

                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={vm.formData.is_required}
                                    onChange={(e) => vm.handleChange('is_required', e.target.checked)}
                                />
                            }
                            label="Required"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={vm.formData.allow_multiple_rules}
                                    onChange={(e) => vm.handleChange('allow_multiple_rules', e.target.checked)}
                                />
                            }
                            label="Allow Multiple Rules"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={vm.formData.is_active}
                                    onChange={(e) => vm.handleChange('is_active', e.target.checked)}
                                />
                            }
                            label="Active"
                        />
                    </Box>

                    {vm.formData.allow_multiple_rules && (
                        <TextField
                            label="Content Separator"
                            value={vm.formData.content_separator}
                            onChange={(e) => vm.handleChange('content_separator', e.target.value)}
                            fullWidth
                            helperText="Separator between multiple rule contents (e.g., &lt;br/&gt; or newline)"
                        />
                    )}

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

export default EmailPlaceholderForm;
