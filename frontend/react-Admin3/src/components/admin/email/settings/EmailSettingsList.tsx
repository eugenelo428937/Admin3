import React, { useEffect } from 'react';
import {
    Container, Typography, Box, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Chip, CircularProgress, Alert, IconButton,
    TextField, Switch, Button,
} from '@mui/material';
import { Edit as EditIcon, Save as SaveIcon, Close as CloseIcon } from '@mui/icons-material';
import { useEmailSettingsListVM } from './useEmailSettingsListVM';
import type { SettingType } from '../../../../types/email';

const SETTING_TYPE_OPTIONS: { value: SettingType | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'smtp', label: 'SMTP' },
    { value: 'queue', label: 'Queue' },
    { value: 'tracking', label: 'Tracking' },
    { value: 'template', label: 'Template' },
    { value: 'security', label: 'Security' },
    { value: 'performance', label: 'Performance' },
    { value: 'integration', label: 'Integration' },
];

const EmailSettingsList: React.FC = () => {
    const vm = useEmailSettingsListVM();

    useEffect(() => {
        vm.fetchSettings();
    }, [vm.filterType]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <Container maxWidth="lg" sx={{ mt: 2 }}>
            <Typography variant="h5" gutterBottom>Email Settings</Typography>

            {vm.error && <Alert severity="error" sx={{ mb: 2 }}>{vm.error}</Alert>}

            <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {SETTING_TYPE_OPTIONS.map(opt => (
                    <Chip
                        key={opt.value}
                        label={opt.label}
                        color={vm.filterType === opt.value ? 'primary' : 'default'}
                        onClick={() => vm.filterByType(opt.value)}
                        variant={vm.filterType === opt.value ? 'filled' : 'outlined'}
                    />
                ))}
            </Box>

            {vm.loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Key</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Display Name</TableCell>
                                <TableCell>Value</TableCell>
                                <TableCell>Active</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {vm.settings.map(setting => (
                                <TableRow key={setting.id}>
                                    <TableCell>
                                        <Typography variant="body2" fontFamily="monospace">
                                            {setting.key}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={setting.setting_type} size="small" />
                                    </TableCell>
                                    <TableCell>{setting.display_name}</TableCell>
                                    <TableCell>
                                        {vm.editingId === setting.id ? (
                                            <TextField
                                                size="small"
                                                value={typeof vm.editFormData.value === 'string'
                                                    ? vm.editFormData.value
                                                    : JSON.stringify(vm.editFormData.value)}
                                                onChange={(e) => {
                                                    let val: any = e.target.value;
                                                    try { val = JSON.parse(val); } catch {}
                                                    vm.handleEditChange('value', val);
                                                }}
                                                fullWidth
                                            />
                                        ) : (
                                            <Typography variant="body2" fontFamily="monospace">
                                                {setting.is_sensitive
                                                    ? '********'
                                                    : typeof setting.value === 'string'
                                                        ? setting.value
                                                        : JSON.stringify(setting.value)}
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {vm.editingId === setting.id ? (
                                            <Switch
                                                checked={vm.editFormData.is_active ?? setting.is_active}
                                                onChange={(e) => vm.handleEditChange('is_active', e.target.checked)}
                                                size="small"
                                            />
                                        ) : (
                                            <Chip
                                                label={setting.is_active ? 'Active' : 'Inactive'}
                                                color={setting.is_active ? 'success' : 'default'}
                                                size="small"
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        {vm.editingId === setting.id ? (
                                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                                <IconButton size="small" color="primary" onClick={vm.saveEdit}>
                                                    <SaveIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton size="small" onClick={vm.cancelEdit}>
                                                    <CloseIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        ) : (
                                            <IconButton size="small" onClick={() => vm.startEdit(setting)}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {vm.settings.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">
                                        <Typography color="text.secondary" sx={{ py: 2 }}>
                                            No settings found
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Container>
    );
};

export default EmailSettingsList;
