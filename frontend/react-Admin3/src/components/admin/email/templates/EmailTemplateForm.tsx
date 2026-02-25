import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Typography,
    Box,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    FormControlLabel,
    Checkbox,
    Button,
    Alert,
    CircularProgress,
    Tabs,
    Tab,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import type { TemplateType, Priority } from '../../../../types/email';
import useEmailTemplateFormVM from './useEmailTemplateFormVM';
import EmailTemplateMjmlEditor from './EmailTemplateMjmlEditor';

const TEMPLATE_TYPE_CHOICES: { value: TemplateType; label: string }[] = [
    { value: 'order_confirmation', label: 'Order Confirmation' },
    { value: 'password_reset', label: 'Password Reset' },
    { value: 'password_reset_completed', label: 'Password Reset Completed' },
    { value: 'account_activation', label: 'Account Activation' },
    { value: 'newsletter', label: 'Newsletter' },
    { value: 'welcome', label: 'Welcome' },
    { value: 'reminder', label: 'Reminder' },
    { value: 'notification', label: 'Notification' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'support', label: 'Support' },
    { value: 'custom', label: 'Custom' },
];

const PRIORITY_CHOICES: { value: Priority; label: string }[] = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
];

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
    <div role="tabpanel" hidden={value !== index}>
        {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
);

const EmailTemplateForm: React.FC = () => {
    const navigate = useNavigate();
    const vm = useEmailTemplateFormVM();

    if (vm.loading) {
        return (
            <Box sx={{ textAlign: 'center', mt: 5 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h2">
                    {vm.isEditMode ? 'Edit Email Template' : 'New Email Template'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={vm.handleSubmit}
                        disabled={vm.isSubmitting}
                    >
                        {vm.isSubmitting ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={() => navigate('/admin/email/templates')}
                    >
                        Cancel
                    </Button>
                </Box>
            </Box>

            {vm.error && <Alert severity="error" sx={{ mb: 3 }}>{vm.error}</Alert>}

            <Paper sx={{ px: 2 }}>
                <Tabs
                    value={vm.activeTab}
                    onChange={(_e, newValue) => vm.setActiveTab(newValue)}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="General" />
                    <Tab label="MJML Editor" />
                    <Tab label="Attachments" />
                    <Tab label="Content Rules" />
                </Tabs>

                {/* General Tab */}
                <TabPanel value={vm.activeTab} index={0}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <TextField
                            label="Name"
                            value={vm.formData.name || ''}
                            onChange={(e) => vm.handleChange('name', e.target.value)}
                            fullWidth
                            required
                        />
                        <TextField
                            label="Display Name"
                            value={vm.formData.display_name || ''}
                            onChange={(e) => vm.handleChange('display_name', e.target.value)}
                            fullWidth
                        />
                        <TextField
                            label="Subject Template"
                            value={vm.formData.subject_template || ''}
                            onChange={(e) => vm.handleChange('subject_template', e.target.value)}
                            fullWidth
                            helperText="Supports {{placeholders}} for dynamic content"
                        />
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <FormControl fullWidth>
                                <InputLabel>Template Type</InputLabel>
                                <Select
                                    value={vm.formData.template_type || 'custom'}
                                    label="Template Type"
                                    onChange={(e) => vm.handleChange('template_type', e.target.value)}
                                >
                                    {TEMPLATE_TYPE_CHOICES.map((choice) => (
                                        <MenuItem key={choice.value} value={choice.value}>
                                            {choice.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl fullWidth>
                                <InputLabel>Default Priority</InputLabel>
                                <Select
                                    value={vm.formData.default_priority || 'normal'}
                                    label="Default Priority"
                                    onChange={(e) => vm.handleChange('default_priority', e.target.value)}
                                >
                                    {PRIORITY_CHOICES.map((choice) => (
                                        <MenuItem key={choice.value} value={choice.value}>
                                            {choice.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                        <TextField
                            label="From Email"
                            value={vm.formData.from_email || ''}
                            onChange={(e) => vm.handleChange('from_email', e.target.value)}
                            fullWidth
                            type="email"
                        />
                        <TextField
                            label="Reply-To Email"
                            value={vm.formData.reply_to_email || ''}
                            onChange={(e) => vm.handleChange('reply_to_email', e.target.value)}
                            fullWidth
                            type="email"
                        />

                        {!vm.formData.is_master && (
                            <FormControl fullWidth>
                                <InputLabel>Closing Salutation</InputLabel>
                                <Select
                                    value={vm.formData.closing_salutation ?? ''}
                                    label="Closing Salutation"
                                    onChange={(e) => vm.handleChange('closing_salutation', String(e.target.value) === '' ? null : Number(e.target.value))}
                                >
                                    <MenuItem value="">
                                        <em>None</em>
                                    </MenuItem>
                                    {vm.salutations.map((sal) => (
                                        <MenuItem key={sal.id} value={sal.id}>
                                            {sal.display_name} — "{sal.sign_off_text}, {sal.signature_type === 'team' ? sal.team_signature : 'Staff'}"
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={vm.formData.use_master_template ?? true}
                                        onChange={(e) => vm.handleChange('use_master_template', e.target.checked)}
                                    />
                                }
                                label="Use Master Template"
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={vm.formData.enable_tracking ?? false}
                                        onChange={(e) => vm.handleChange('enable_tracking', e.target.checked)}
                                    />
                                }
                                label="Enable Tracking"
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={vm.formData.enable_queue ?? true}
                                        onChange={(e) => vm.handleChange('enable_queue', e.target.checked)}
                                    />
                                }
                                label="Enable Queue"
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={vm.formData.enhance_outlook_compatibility ?? false}
                                        onChange={(e) => vm.handleChange('enhance_outlook_compatibility', e.target.checked)}
                                    />
                                }
                                label="Enhance Outlook Compatibility"
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={vm.formData.is_master ?? false}
                                        onChange={(e) => vm.handleChange('is_master', e.target.checked)}
                                    />
                                }
                                label="Master Component"
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={vm.formData.is_active ?? true}
                                        onChange={(e) => vm.handleChange('is_active', e.target.checked)}
                                    />
                                }
                                label="Active"
                            />
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                label="Max Retry Attempts"
                                value={vm.formData.max_retry_attempts ?? 3}
                                onChange={(e) => vm.handleChange('max_retry_attempts', parseInt(e.target.value, 10) || 0)}
                                type="number"
                                inputProps={{ min: 0, max: 10 }}
                                sx={{ width: 200 }}
                            />
                            <TextField
                                label="Retry Delay (minutes)"
                                value={vm.formData.retry_delay_minutes ?? 5}
                                onChange={(e) => vm.handleChange('retry_delay_minutes', parseInt(e.target.value, 10) || 0)}
                                type="number"
                                inputProps={{ min: 0, max: 1440 }}
                                sx={{ width: 200 }}
                            />
                        </Box>
                    </Box>
                </TabPanel>

                {/* MJML Editor Tab */}
                <TabPanel value={vm.activeTab} index={1}>
                    {vm.isEditMode && vm.formData.id ? (
                        <EmailTemplateMjmlEditor
                            templateId={vm.formData.id}
                            initialContent={vm.formData.mjml_content || ''}
                            initialBasicModeContent={vm.formData.basic_mode_content || ''}
                        />
                    ) : (
                        <Alert severity="info">
                            Save the template first to enable the MJML editor.
                        </Alert>
                    )}
                </TabPanel>

                {/* Attachments Tab */}
                <TabPanel value={vm.activeTab} index={2}>
                    <Typography variant="subtitle1" gutterBottom>
                        Template Attachments
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Attachment</TableCell>
                                    <TableCell>Required</TableCell>
                                    <TableCell>Order</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {vm.formData.attachments && vm.formData.attachments.length > 0 ? (
                                    vm.formData.attachments.map((ta) => (
                                        <TableRow key={ta.id}>
                                            <TableCell>{ta.attachment.display_name}</TableCell>
                                            <TableCell>{ta.is_required ? 'Yes' : 'No'}</TableCell>
                                            <TableCell>{ta.order}</TableCell>
                                            <TableCell>-</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center">
                                            No attachments configured. This feature will be enhanced in a future update.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </TabPanel>

                {/* Content Rules Tab */}
                <TabPanel value={vm.activeTab} index={3}>
                    <Typography variant="subtitle1" gutterBottom>
                        Template Content Rules
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Content Rule</TableCell>
                                    <TableCell>Enabled</TableCell>
                                    <TableCell>Priority</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {vm.formData.template_content_rules && vm.formData.template_content_rules.length > 0 ? (
                                    vm.formData.template_content_rules.map((tcr) => (
                                        <TableRow key={tcr.id}>
                                            <TableCell>{tcr.content_rule.name}</TableCell>
                                            <TableCell>{tcr.is_enabled ? 'Yes' : 'No'}</TableCell>
                                            <TableCell>{tcr.effective_priority}</TableCell>
                                            <TableCell>-</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center">
                                            No content rules configured. This feature will be enhanced in a future update.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </TabPanel>
            </Paper>
        </Container>
    );
};

export default EmailTemplateForm;
