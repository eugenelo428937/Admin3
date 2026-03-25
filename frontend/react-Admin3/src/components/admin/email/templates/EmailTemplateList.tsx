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
    AdminToggleGroup,
} from '@/components/admin/composed';
import type { SimpleColumn } from '@/components/admin/composed';
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
    { value: 'email_verification', label: 'Email Verification' },
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
        { key: 'display_name', header: 'Display Name' },
        { key: 'subject_template', header: 'Subject' },
        { key: 'default_priority', header: 'Priority' },
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

            <AdminToggleGroup
                label="Master"
                options={MASTER_FILTER_OPTIONS}
                value={vm.filterMaster}
                onChange={vm.setFilterMaster}
                className="tw:mb-2"
            />

            <AdminToggleGroup
                label="Type"
                options={TEMPLATE_TYPE_OPTIONS}
                value={vm.filterTemplateType}
                onChange={vm.setFilterTemplateType}
                className="tw:mb-4"
            />

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
