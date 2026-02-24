import { useState, useCallback } from 'react';
import emailService from '../../../../services/emailService';
import type { EmailSettings, SettingType } from '../../../../types/email';

interface EmailSettingsListVM {
    settings: EmailSettings[];
    loading: boolean;
    error: string | null;
    filterType: SettingType | 'all';
    editingId: number | null;
    editFormData: Partial<EmailSettings>;
    fetchSettings: () => Promise<void>;
    filterByType: (type: SettingType | 'all') => void;
    startEdit: (setting: EmailSettings) => void;
    cancelEdit: () => void;
    saveEdit: () => Promise<void>;
    handleEditChange: (field: string, value: any) => void;
}

export const useEmailSettingsListVM = (): EmailSettingsListVM => {
    const [settings, setSettings] = useState<EmailSettings[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<SettingType | 'all'>('all');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editFormData, setEditFormData] = useState<Partial<EmailSettings>>({});

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, any> = {};
            if (filterType !== 'all') params.setting_type = filterType;
            const response = await emailService.getSettings(params);
            setSettings(response.results);
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to load settings');
        } finally {
            setLoading(false);
        }
    }, [filterType]);

    const filterByType = useCallback((type: SettingType | 'all') => {
        setFilterType(type);
    }, []);

    const startEdit = useCallback((setting: EmailSettings) => {
        setEditingId(setting.id);
        setEditFormData({ value: setting.value, is_active: setting.is_active });
    }, []);

    const cancelEdit = useCallback(() => {
        setEditingId(null);
        setEditFormData({});
    }, []);

    const handleEditChange = useCallback((field: string, value: any) => {
        setEditFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const saveEdit = useCallback(async () => {
        if (editingId === null) return;
        try {
            await emailService.patchSetting(editingId, editFormData);
            setEditingId(null);
            setEditFormData({});
            await fetchSettings();
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to save setting');
        }
    }, [editingId, editFormData, fetchSettings]);

    return {
        settings, loading, error, filterType, editingId, editFormData,
        fetchSettings, filterByType, startEdit, cancelEdit, saveEdit, handleEditChange,
    };
};
