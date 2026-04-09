import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  AdminPage,
  AdminPageHeader,
  AdminDataTable,
  AdminErrorAlert,
  AdminBadge,
} from '@/components/admin/composed';
import { Badge } from '@/components/admin/ui/badge';
import useEmailPlaceholderListVM from './useEmailPlaceholderListVM';
import type { InsertPosition } from '../../../../types/email';

const INSERT_POSITION_STYLE: Record<InsertPosition, string> = {
    replace: 'tw:border-blue-200 tw:bg-blue-50 tw:text-blue-700',
    before: 'tw:border-purple-200 tw:bg-purple-50 tw:text-purple-700',
    after: 'tw:border-sky-200 tw:bg-sky-50 tw:text-sky-700',
    append: 'tw:border-amber-200 tw:bg-amber-50 tw:text-amber-700',
    prepend: 'tw:border-emerald-200 tw:bg-emerald-50 tw:text-emerald-700',
};

const EmailPlaceholderList: React.FC = () => {
    const navigate = useNavigate();
    const vm = useEmailPlaceholderListVM();

    useEffect(() => {
        vm.fetchPlaceholders();
    }, [vm.page, vm.rowsPerPage]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <AdminPage>
            <AdminPageHeader
                title="Email Placeholders"
                actions={[
                    { label: 'Add Placeholder', icon: Plus, onClick: () => navigate('/admin/email/placeholders/new') },
                ]}
            />

            <AdminErrorAlert message={vm.error} />

            <AdminDataTable
                columns={[
                    {
                        key: 'name',
                        header: 'Name',
                        render: (val) => <span className="tw:font-mono">{val}</span>,
                    },
                    { key: 'display_name', header: 'Display Name' },
                    {
                        key: 'insert_position',
                        header: 'Insert Position',
                        render: (val) => (
                            <Badge variant="outline" className={INSERT_POSITION_STYLE[val as InsertPosition] || ''}>
                                {val}
                            </Badge>
                        ),
                    },
                    {
                        key: 'is_required',
                        header: 'Required',
                        render: (val) => (
                            <Badge
                                variant="outline"
                                className={val
                                    ? 'tw:border-amber-200 tw:bg-amber-50 tw:text-amber-700'
                                    : 'tw:border-admin-border tw:bg-admin-bg-muted tw:text-admin-fg-muted'}
                            >
                                {val ? 'Yes' : 'No'}
                            </Badge>
                        ),
                    },
                    {
                        key: 'is_active',
                        header: 'Active',
                        align: 'center',
                        render: (val) => <AdminBadge active={!!val} />,
                    },
                ]}
                data={vm.placeholders}
                loading={vm.loading}
                emptyMessage="No placeholders found"
                pagination={{
                    page: vm.page,
                    pageSize: vm.rowsPerPage,
                    total: vm.totalCount,
                    onPageChange: vm.handleChangePage,
                    onPageSizeChange: vm.handleChangeRowsPerPage,
                    pageSizeOptions: [10, 25, 50],
                }}
                actions={(row) => [
                    { label: 'Edit', icon: Pencil, onClick: () => vm.handleEdit(row.id) },
                    { label: 'Delete', icon: Trash2, variant: 'destructive' as const, onClick: () => vm.handleDelete(row.id) },
                ]}
            />
        </AdminPage>
    );
};

export default EmailPlaceholderList;
