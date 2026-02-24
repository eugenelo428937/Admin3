import React, { useCallback, useRef, useState } from 'react';
import {
    Container, Typography, Box, TextField, Button, Paper,
    CircularProgress, Alert, MenuItem, FormControlLabel, Checkbox,
} from '@mui/material';
import {
    Save as SaveIcon,
    Cancel as CancelIcon,
    CloudUpload as UploadIcon,
    InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import useEmailAttachmentFormVM from './useEmailAttachmentFormVM';
import type { AttachmentType } from '../../../../types/email';

const ATTACHMENT_TYPES: { value: AttachmentType; label: string }[] = [
    { value: 'static', label: 'Static' },
    { value: 'dynamic', label: 'Dynamic' },
    { value: 'template', label: 'Template' },
    { value: 'external', label: 'External' },
];

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const EmailAttachmentForm: React.FC = () => {
    const vm = useEmailAttachmentFormVM();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0] || null;
        vm.handleFileSelect(file);
    }, [vm]);

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        vm.handleFileSelect(file);
    }, [vm]);

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
                {vm.isEditMode ? 'Edit Attachment' : 'New Attachment'}
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
                        label="Display Name"
                        value={vm.formData.display_name}
                        onChange={(e) => vm.handleChange('display_name', e.target.value)}
                        fullWidth
                        required
                    />

                    <TextField
                        label="Attachment Type"
                        value={vm.formData.attachment_type}
                        onChange={(e) => vm.handleChange('attachment_type', e.target.value)}
                        select
                        fullWidth
                        required
                    >
                        {ATTACHMENT_TYPES.map(opt => (
                            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        label="Description"
                        value={vm.formData.description}
                        onChange={(e) => vm.handleChange('description', e.target.value)}
                        fullWidth
                        multiline
                        rows={3}
                    />

                    {/* File Upload Dropzone */}
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>File</Typography>
                        {vm.currentFileInfo && !vm.selectedFile && (
                            <Box sx={{ mb: 1, p: 1.5, bgcolor: 'grey.50', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <FileIcon color="action" />
                                <Box>
                                    <Typography variant="body2">{vm.currentFileInfo.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {formatFileSize(vm.currentFileInfo.size)}
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                        <Box
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            sx={{
                                border: '2px dashed',
                                borderColor: isDragOver ? 'primary.main' : 'grey.300',
                                borderRadius: 1,
                                p: 3,
                                textAlign: 'center',
                                cursor: 'pointer',
                                bgcolor: isDragOver ? 'action.hover' : 'transparent',
                                transition: 'all 0.2s ease',
                                '&:hover': { borderColor: 'primary.light', bgcolor: 'action.hover' },
                            }}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                hidden
                                onChange={handleFileInputChange}
                            />
                            <UploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                            {vm.selectedFile ? (
                                <Box>
                                    <Typography variant="body2">{vm.selectedFile.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {formatFileSize(vm.selectedFile.size)}
                                    </Typography>
                                </Box>
                            ) : (
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Drag and drop a file here, or click to select
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>

                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={vm.formData.is_conditional}
                                onChange={(e) => vm.handleChange('is_conditional', e.target.checked)}
                            />
                        }
                        label="Conditional attachment"
                    />

                    {vm.formData.is_conditional && (
                        <TextField
                            label="Condition Rules (JSON)"
                            value={vm.formData.condition_rules}
                            onChange={(e) => vm.handleChange('condition_rules', e.target.value)}
                            fullWidth
                            multiline
                            rows={4}
                            InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.875rem' } }}
                            helperText="Enter condition rules as valid JSON"
                        />
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

export default EmailAttachmentForm;
