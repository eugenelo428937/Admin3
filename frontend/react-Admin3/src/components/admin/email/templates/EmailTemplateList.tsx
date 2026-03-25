import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
    AdminPage,
    AdminPageHeader,
    AdminDataTable,
    AdminErrorAlert,
    AdminLoadingState,
    AdminBadge,
} from '@/components/admin/composed';
import type { SimpleColumn } from '@/components/admin/composed';
import { Badge } from '@/components/admin/ui/badge';
import { Button } from '@/components/admin/ui/button';
import useEmailTemplateListVM from './useEmailTemplateListVM';
import type { TemplateType } from '../../../../types/email';
import type { MasterFilter } from './useEmailTemplateListVM';

const TEMPLATE_TYPE_OPTIONS: { value: TemplateType | 'all'; label: string }[] = [
    { value: 'all', label: 'All Types' },
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

const MASTER_FILTER_OPTIONS: { value: MasterFilter; label: string }[] = [
    { value: 'general', label: 'General Templates' },
    { value: 'master', label: 'Master Templates' },
];

const EmailTemplateList: React.FC = () => {
    const vm = useEmailTemplateListVM();
    const navigate = useNavigate();

    if (vm.loading) {
        return (
            <AdminPage>
                <AdminLoadingState rows={5} columns={8} />
            </AdminPage>
        );
    }

    const columns: SimpleColumn<any>[] = [
        { key: 'name', header: 'Name' },
        { key: 'display_name', header: 'Display Name' },
        { key: 'template_type', header: 'Type' },
        { key: 'subject_template', header: 'Subject' },
        { key: 'default_priority', header: 'Priority' },
        {
            key: 'is_master',
            header: 'Master',
            render: (value: boolean) =>
                value ? (
                    <Badge variant="secondary">Master</Badge>
                ) : null,
        },
        {
            key: 'is_active',
            header: 'Active',
            render: (value: boolean) => (
                <AdminBadge active={value} />
            ),
        },
    ];

    return (
        <AdminPage>
            <AdminPageHeader
                title="Email Templates"
                actions={[
                    {
                        label: 'Add Template',
                        icon: Plus,
                        onClick: () => navigate('/admin/email/templates/new'),
                    },
                ]}
            />

            <AdminErrorAlert message={vm.error} />

            {/* Master filter */}
            <div className="tw:mb-2 tw:flex tw:flex-wrap tw:items-center tw:gap-2">
                <span className="tw:mr-1 tw:text-sm tw:text-admin-fg-muted">Master:</span>
                {MASTER_FILTER_OPTIONS.map(opt => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => vm.setFilterMaster(opt.value)}
                        className={`tw:inline-flex tw:items-center tw:rounded-full tw:border tw:px-2.5 tw:py-0.5 tw:text-xs tw:font-medium tw:transition-colors ${
                            vm.filterMaster === opt.value
                                ? 'tw:border-primary tw:bg-primary tw:text-primary-foreground'
                                : 'tw:border-admin-border tw:bg-transparent tw:text-admin-fg-muted tw:hover:bg-admin-bg-muted'
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* Template type filter */}
            <div className="tw:mb-4 tw:flex tw:flex-wrap tw:items-center tw:gap-2">
                <span className="tw:mr-1 tw:text-sm tw:text-admin-fg-muted">Type:</span>
                {TEMPLATE_TYPE_OPTIONS.map(opt => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => vm.setFilterTemplateType(opt.value)}
                        className={`tw:inline-flex tw:items-center tw:rounded-full tw:border tw:px-2.5 tw:py-0.5 tw:text-xs tw:font-medium tw:transition-colors ${
                            vm.filterTemplateType === opt.value
                                ? 'tw:border-primary tw:bg-primary tw:text-primary-foreground'
                                : 'tw:border-admin-border tw:bg-transparent tw:text-admin-fg-muted tw:hover:bg-admin-bg-muted'
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            <AdminDataTable
                columns={columns}
                data={vm.templates}
                emptyMessage="No email templates found."
                actions={(row) => [
                    {
                        label: 'Edit',
                        icon: Pencil,
                        onClick: () => vm.handleEdit(row.id),
                    },
                    {
                        label: 'Delete',
                        icon: Trash2,
                        variant: 'destructive',
                        onClick: () => vm.handleDelete(row.id),
                    },
                ]}
                pagination={vm.totalCount > vm.rowsPerPage ? {
                    page: vm.page,
                    pageSize: vm.rowsPerPage,
                    total: vm.totalCount,
                    onPageChange: vm.handleChangePage,
                    onPageSizeChange: vm.handleChangeRowsPerPage,
                    pageSizeOptions: [10, 25, 50, 100],
                } : undefined}
            />
        </AdminPage>
    );
};

export default EmailTemplateList;
