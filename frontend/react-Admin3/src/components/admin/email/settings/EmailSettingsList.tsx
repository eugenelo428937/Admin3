import React, { useEffect } from 'react';
import { Pencil, Save, X } from 'lucide-react';
import {
  AdminPage,
  AdminPageHeader,
  AdminErrorAlert,
  AdminDataTable,
  AdminBadge,
  AdminToggleGroup,
} from '@/components/admin/composed';
import type { SimpleColumn } from '@/components/admin/composed';
import { Badge } from '@/components/admin/ui/badge';
import { Input } from '@/components/admin/ui/input';
import { Switch } from '@/components/admin/ui/switch';
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

    const columns: SimpleColumn<any>[] = [
        {
            key: 'key',
            header: 'Key',
            render: (value: string) => <span className="tw:font-mono">{value}</span>,
        },
        {
            key: 'setting_type',
            header: 'Type',
            render: (value: string) => <Badge variant="outline">{value}</Badge>,
        },
        {
            key: 'display_name',
            header: 'Display Name',
        },
        {
            key: 'value',
            header: 'Value',
            render: (value: any, row: any) => {
                if (vm.editingId === row.id) {
                    return (
                        <Input
                            className="tw:h-8 tw:max-w-xs"
                            value={typeof vm.editFormData.value === 'string'
                                ? vm.editFormData.value
                                : JSON.stringify(vm.editFormData.value)}
                            onChange={(e) => {
                                let val: any = e.target.value;
                                try { val = JSON.parse(val); } catch {}
                                vm.handleEditChange('value', val);
                            }}
                        />
                    );
                }
                return (
                    <span className="tw:font-mono">
                        {row.is_sensitive
                            ? '********'
                            : typeof value === 'string'
                                ? value
                                : JSON.stringify(value)}
                    </span>
                );
            },
        },
        {
            key: 'is_active',
            header: 'Active',
            align: 'center',
            render: (value: boolean, row: any) => (
                vm.editingId === row.id ? (
                    <Switch
                        size="sm"
                        checked={vm.editFormData.is_active ?? value}
                        onCheckedChange={(checked) => vm.handleEditChange('is_active', checked)}
                    />
                ) : (
                    <AdminBadge active={value} />
                )
            ),
        },
    ];

    return (
        <AdminPage>
            <AdminPageHeader title="Email Settings" />

            <AdminErrorAlert message={vm.error} />

            <AdminToggleGroup
                options={SETTING_TYPE_OPTIONS}
                value={vm.filterType}
                onChange={vm.filterByType}
                className="tw:mb-6"
            />

            <AdminDataTable
                columns={columns}
                data={vm.settings}
                loading={vm.loading}
                emptyMessage="No settings found"
                actions={(row: any) => (
                    vm.editingId === row.id
                        ? [
                            { label: 'Save', icon: Save, onClick: () => vm.saveEdit() },
                            { label: 'Cancel', icon: X, onClick: () => vm.cancelEdit() },
                        ]
                        : [
                            { label: 'Edit', icon: Pencil, onClick: () => vm.startEdit(row) },
                        ]
                )}
            />
        </AdminPage>
    );
};

export default EmailSettingsList;
