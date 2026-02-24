import React from 'react';
import {
    Container, Typography, Box, TextField, Button, Paper,
    CircularProgress, Alert, MenuItem, FormControlLabel, Checkbox,
    Tabs, Tab, Divider,
} from '@mui/material';
import {
    Save as SaveIcon,
    Cancel as CancelIcon,
} from '@mui/icons-material';
import useEmailContentRuleFormVM from './useEmailContentRuleFormVM';
import RuleConditionBuilder from '../shared/RuleConditionBuilder';
import RuleJsonEditor from '../shared/RuleJsonEditor';
import type { RuleType } from '../../../../types/email';

const RULE_TYPES: { value: RuleType; label: string }[] = [
    { value: 'product_based', label: 'Product Based' },
    { value: 'user_attribute', label: 'User Attribute' },
    { value: 'order_value', label: 'Order Value' },
    { value: 'location_based', label: 'Location Based' },
    { value: 'date_based', label: 'Date Based' },
    { value: 'custom_condition', label: 'Custom Condition' },
];

const EmailContentRuleForm: React.FC = () => {
    const vm = useEmailContentRuleFormVM();

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
                {vm.isEditMode ? 'Edit Content Rule' : 'New Content Rule'}
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
                    />

                    <TextField
                        label="Description"
                        value={vm.formData.description}
                        onChange={(e) => vm.handleChange('description', e.target.value)}
                        fullWidth
                        multiline
                        rows={3}
                    />

                    <TextField
                        label="Rule Type"
                        value={vm.formData.rule_type}
                        onChange={(e) => vm.handleChange('rule_type', e.target.value)}
                        select
                        fullWidth
                        required
                    >
                        {RULE_TYPES.map(opt => (
                            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        label="Placeholder"
                        value={vm.formData.placeholder}
                        onChange={(e) => vm.handleChange('placeholder', e.target.value ? Number(e.target.value) : '')}
                        select
                        fullWidth
                        required
                    >
                        <MenuItem value="">
                            <em>Select a placeholder</em>
                        </MenuItem>
                        {vm.placeholders.map(p => (
                            <MenuItem key={p.id} value={p.id}>
                                {p.display_name || p.name}
                            </MenuItem>
                        ))}
                    </TextField>

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            label="Priority"
                            type="number"
                            value={vm.formData.priority}
                            onChange={(e) => vm.handleChange('priority', parseInt(e.target.value, 10) || 0)}
                            sx={{ width: 150 }}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={vm.formData.is_exclusive}
                                    onChange={(e) => vm.handleChange('is_exclusive', e.target.checked)}
                                />
                            }
                            label="Exclusive"
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

                    <Divider />

                    {/* Condition Section */}
                    <Typography variant="subtitle1">Condition</Typography>

                    <Tabs
                        value={vm.conditionMode}
                        onChange={(_, newValue) => vm.toggleConditionMode(newValue)}
                        sx={{ mb: 1 }}
                    >
                        <Tab label="Visual Builder" value="visual" />
                        <Tab label="JSON" value="json" />
                    </Tabs>

                    {vm.conditionMode === 'visual' ? (
                        <RuleConditionBuilder
                            conditionField={vm.formData.condition_field}
                            conditionOperator={vm.formData.condition_operator}
                            conditionValue={vm.formData.condition_value}
                            additionalConditions={vm.formData.additional_conditions}
                            onChange={vm.handleConditionChange}
                        />
                    ) : (
                        <RuleJsonEditor
                            value={vm.jsonCondition}
                            onChange={vm.handleJsonConditionChange}
                            error={vm.jsonConditionError}
                        />
                    )}

                    <Divider />

                    <TextField
                        label="Custom Logic"
                        value={vm.formData.custom_logic}
                        onChange={(e) => vm.handleChange('custom_logic', e.target.value)}
                        fullWidth
                        multiline
                        rows={4}
                        helperText="Advanced custom logic expression (optional)"
                        InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.875rem' } }}
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

export default EmailContentRuleForm;
