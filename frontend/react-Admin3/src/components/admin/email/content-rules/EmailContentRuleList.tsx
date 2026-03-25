import React, { useEffect } from 'react';
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
import useEmailContentRuleListVM from './useEmailContentRuleListVM';
import type { RuleType } from '../../../../types/email';

const RULE_TYPE_CLASS: Record<RuleType, string> = {
    product_based: 'tw:border-primary/30 tw:bg-primary/10 tw:text-primary',
    user_attribute: 'tw:border-purple-200 tw:bg-purple-50 tw:text-purple-700',
    order_value: 'tw:border-blue-200 tw:bg-blue-50 tw:text-blue-700',
    location_based: 'tw:border-amber-200 tw:bg-amber-50 tw:text-amber-700',
    date_based: 'tw:border-admin-success/30 tw:bg-admin-success/10 tw:text-admin-success',
    custom_condition: 'tw:border-admin-destructive/30 tw:bg-admin-destructive/10 tw:text-admin-destructive',
};

const RULE_TYPE_LABEL: Record<RuleType, string> = {
    product_based: 'Product Based',
    user_attribute: 'User Attribute',
    order_value: 'Order Value',
    location_based: 'Location Based',
    date_based: 'Date Based',
    custom_condition: 'Custom',
};

const EmailContentRuleList: React.FC = () => {
    const navigate = useNavigate();
    const vm = useEmailContentRuleListVM();

    useEffect(() => {
        vm.fetchRules();
    }, [vm.page, vm.rowsPerPage]); // eslint-disable-line react-hooks/exhaustive-deps

    const columns: SimpleColumn<any>[] = [
        { key: 'name', header: 'Name' },
        {
            key: 'rule_type',
            header: 'Rule Type',
            render: (value: RuleType) => (
                <Badge variant="outline" className={RULE_TYPE_CLASS[value] || ''}>
                    {RULE_TYPE_LABEL[value] || value}
                </Badge>
            ),
        },
        {
            key: 'placeholder_name',
            header: 'Placeholder',
            render: (value: string, row: any) => (
                <span className="tw:font-mono tw:text-sm">
                    {value || `#${row.placeholder}`}
                </span>
            ),
        },
        { key: 'priority', header: 'Priority' },
        {
            key: 'is_exclusive',
            header: 'Exclusive',
            render: (value: boolean) => (
                <Badge
                    variant="outline"
                    className={value ? 'tw:border-amber-200 tw:bg-amber-50 tw:text-amber-700' : ''}
                >
                    {value ? 'Yes' : 'No'}
                </Badge>
            ),
        },
        {
            key: 'is_active',
            header: 'Active',
            align: 'center',
            render: (value: boolean) => <AdminBadge active={value} />,
        },
    ];

    if (vm.loading) {
        return (
            <AdminPage>
                <AdminLoadingState rows={5} columns={7} />
            </AdminPage>
        );
    }

    return (
        <AdminPage>
            <AdminPageHeader
                title="Email Content Rules"
                actions={[
                    {
                        label: 'Add Content Rule',
                        icon: Plus,
                        onClick: () => navigate('/admin/email/content-rules/new'),
                    },
                ]}
            />

            <AdminErrorAlert message={vm.error} />

            <AdminDataTable
                columns={columns}
                data={vm.rules}
                emptyMessage="No content rules found"
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
                pagination={{
                    page: vm.page,
                    pageSize: vm.rowsPerPage,
                    total: vm.totalCount,
                    onPageChange: vm.handleChangePage,
                    onPageSizeChange: vm.handleChangeRowsPerPage,
                    pageSizeOptions: [10, 25, 50],
                }}
            />
        </AdminPage>
    );
};

export default EmailContentRuleList;
