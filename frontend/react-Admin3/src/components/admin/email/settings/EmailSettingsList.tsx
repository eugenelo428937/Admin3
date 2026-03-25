import React, { useEffect } from 'react';
import { Pencil, Save, X } from 'lucide-react';
import {
  AdminPage,
  AdminPageHeader,
  AdminErrorAlert,
  AdminLoadingState,
  AdminEmptyState,
  AdminBadge,
  AdminToggleGroup,
} from '@/components/admin/composed';
import { Badge } from '@/components/admin/ui/badge';
import { Button } from '@/components/admin/ui/button';
import { Input } from '@/components/admin/ui/input';
import { Switch } from '@/components/admin/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/admin/ui/table';
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
        <AdminPage>
            <AdminPageHeader title="Email Settings" />

            <AdminErrorAlert message={vm.error} />

            <AdminToggleGroup
                options={SETTING_TYPE_OPTIONS}
                value={vm.filterType}
                onChange={vm.filterByType}
                className="tw:mb-6"
            />

            {vm.loading ? (
                <AdminLoadingState rows={6} columns={6} />
            ) : vm.settings.length === 0 ? (
                <AdminEmptyState title="No settings found" />
            ) : (
                <div className="tw:rounded-md tw:border tw:border-admin-border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Key</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Display Name</TableHead>
                                <TableHead>Value</TableHead>
                                <TableHead>Active</TableHead>
                                <TableHead className="tw:text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {vm.settings.map(setting => (
                                <TableRow key={setting.id}>
                                    <TableCell>
                                        <span className="tw:font-mono tw:text-sm">{setting.key}</span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{setting.setting_type}</Badge>
                                    </TableCell>
                                    <TableCell>{setting.display_name}</TableCell>
                                    <TableCell>
                                        {vm.editingId === setting.id ? (
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
                                        ) : (
                                            <span className="tw:font-mono tw:text-sm">
                                                {setting.is_sensitive
                                                    ? '********'
                                                    : typeof setting.value === 'string'
                                                        ? setting.value
                                                        : JSON.stringify(setting.value)}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {vm.editingId === setting.id ? (
                                            <Switch
                                                size="sm"
                                                checked={vm.editFormData.is_active ?? setting.is_active}
                                                onCheckedChange={(checked) => vm.handleEditChange('is_active', checked)}
                                            />
                                        ) : (
                                            <AdminBadge active={setting.is_active} />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="tw:flex tw:justify-end tw:gap-1">
                                            {vm.editingId === setting.id ? (
                                                <>
                                                    <Button variant="ghost" size="icon-xs" onClick={vm.saveEdit}>
                                                        <Save className="tw:size-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon-xs" onClick={vm.cancelEdit}>
                                                        <X className="tw:size-4" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button variant="ghost" size="icon-xs" onClick={() => vm.startEdit(setting)}>
                                                    <Pencil className="tw:size-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </AdminPage>
    );
};

export default EmailSettingsList;
