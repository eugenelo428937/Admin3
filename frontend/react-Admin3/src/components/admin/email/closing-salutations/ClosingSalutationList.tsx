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
import useClosingSalutationListVM from './useClosingSalutationListVM';

const ClosingSalutationList: React.FC = () => {
    const navigate = useNavigate();
    const vm = useClosingSalutationListVM();

    useEffect(() => {
        vm.fetchSalutations();
    }, [vm.page, vm.rowsPerPage]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <AdminPage>
            <AdminPageHeader
                title="Closing Salutations"
                actions={[
                    { label: 'Add Salutation', icon: Plus, onClick: () => navigate('/admin/email/closing-salutations/new') },
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
                    { key: 'display_name', header: 'Signature' },
                    { key: 'sign_off_text', header: 'Sign-off' },
                    { key: 'job_title', header: 'Job Title' },
                    {
                        key: 'is_active',
                        header: 'Active',
                        align: 'center',
                        render: (val) => <AdminBadge active={!!val} />,
                    },
                ]}
                data={vm.salutations}
                loading={vm.loading}
                emptyMessage="No closing salutations found"
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

export default ClosingSalutationList;
