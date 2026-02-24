import React, { useEffect, useState } from 'react';
import {
    Container,
    Paper,
    Typography,
    Box,
    CircularProgress,
    Alert,
    Chip,
    Button,
    TextField,
    Divider,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useEmailQueueDuplicateFormVM } from './useEmailQueueDuplicateFormVM';

interface EmailChipInputProps {
    label: string;
    emails: string[];
    onEmailsChange: (emails: string[]) => void;
}

const EmailChipInput: React.FC<EmailChipInputProps> = ({ label, emails, onEmailsChange }) => {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            onEmailsChange([...emails, inputValue.trim()]);
            setInputValue('');
        }
    };

    const handleDelete = (index: number) => {
        const updated = emails.filter((_, i) => i !== index);
        onEmailsChange(updated);
    };

    return (
        <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                {label}
            </Typography>
            <Box
                sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 0.5,
                    mb: 1,
                    minHeight: emails.length > 0 ? 'auto' : 0,
                }}
            >
                {emails.map((email, index) => (
                    <Chip
                        key={index}
                        label={email}
                        onDelete={() => handleDelete(index)}
                        size="small"
                        variant="outlined"
                    />
                ))}
            </Box>
            <TextField
                fullWidth
                size="small"
                placeholder={`Type an email and press Enter to add`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                type="email"
            />
        </Box>
    );
};

const EmailQueueDuplicateForm: React.FC = () => {
    const navigate = useNavigate();
    const vm = useEmailQueueDuplicateFormVM();

    useEffect(() => {
        vm.fetchOriginal();
    }, [vm.fetchOriginal]);

    if (vm.loading) {
        return (
            <Box sx={{ textAlign: 'center', mt: 5 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!vm.originalItem && !vm.loading && !vm.error) {
        return (
            <Container sx={{ mt: 4 }}>
                <Alert severity="warning">Original queue item not found.</Alert>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate('/admin/email/queue')}
                    sx={{ mt: 2 }}
                >
                    Back to Queue
                </Button>
            </Container>
        );
    }

    return (
        <Container sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                <Typography variant="h4" component="h2">
                    Duplicate Queue Item
                </Typography>
            </Box>

            {vm.error && <Alert severity="error" sx={{ mb: 3 }}>{vm.error}</Alert>}

            {/* Original Item Info (read-only) */}
            {vm.originalItem && (
                <Paper sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
                    <Typography variant="h6" gutterBottom>
                        Original Item
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary">
                                Template
                            </Typography>
                            <Typography variant="body2">
                                {vm.originalItem.template_name || '-'}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary">
                                Priority
                            </Typography>
                            <Chip label={vm.originalItem.priority} size="small" variant="outlined" />
                        </Box>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary">
                                Original Subject
                            </Typography>
                            <Typography variant="body2" noWrap>
                                {vm.originalItem.subject || '-'}
                            </Typography>
                        </Box>
                    </Box>
                </Paper>
            )}

            {/* Editable Form */}
            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Email Details
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* To Emails */}
                    <EmailChipInput
                        label="To"
                        emails={vm.formData.to_emails}
                        onEmailsChange={(emails) => vm.handleEmailListChange('to_emails', emails)}
                    />

                    {/* CC Emails */}
                    <EmailChipInput
                        label="CC"
                        emails={vm.formData.cc_emails}
                        onEmailsChange={(emails) => vm.handleEmailListChange('cc_emails', emails)}
                    />

                    {/* BCC Emails */}
                    <EmailChipInput
                        label="BCC"
                        emails={vm.formData.bcc_emails}
                        onEmailsChange={(emails) => vm.handleEmailListChange('bcc_emails', emails)}
                    />

                    {/* From Email */}
                    <TextField
                        label="From Email"
                        fullWidth
                        size="small"
                        value={vm.formData.from_email}
                        onChange={(e) => vm.handleChange('from_email', e.target.value)}
                        type="email"
                    />

                    {/* Reply-To Email */}
                    <TextField
                        label="Reply-To Email"
                        fullWidth
                        size="small"
                        value={vm.formData.reply_to_email}
                        onChange={(e) => vm.handleChange('reply_to_email', e.target.value)}
                        type="email"
                    />

                    {/* Subject */}
                    <TextField
                        label="Subject"
                        fullWidth
                        size="small"
                        value={vm.formData.subject}
                        onChange={(e) => vm.handleChange('subject', e.target.value)}
                    />
                </Box>

                {/* Actions */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
                    <Button
                        variant="outlined"
                        onClick={() => navigate('/admin/email/queue')}
                        disabled={vm.isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={vm.isSubmitting ? <CircularProgress size={16} /> : <SaveIcon />}
                        onClick={vm.handleSubmit}
                        disabled={vm.isSubmitting}
                    >
                        {vm.isSubmitting ? 'Saving...' : 'Save Duplicate'}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default EmailQueueDuplicateForm;
