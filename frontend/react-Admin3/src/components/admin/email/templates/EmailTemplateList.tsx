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
import useEmailTemplateListVM from './useEmailTemplateListVM';

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
            align: 'center',
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
                label="Type"
                options={vm.templateTypeOptions}
                value={vm.filterTemplateType}
                onChange={vm.setFilterTemplateType}
                
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
