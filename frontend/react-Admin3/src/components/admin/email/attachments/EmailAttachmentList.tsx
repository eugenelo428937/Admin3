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
import useEmailAttachmentListVM from './useEmailAttachmentListVM';
import type { AttachmentType } from '../../../../types/email';

const ATTACHMENT_TYPE_STYLE: Record<AttachmentType, string> = {
    static: 'tw:border-blue-200 tw:bg-blue-50 tw:text-blue-700',
    dynamic: 'tw:border-purple-200 tw:bg-purple-50 tw:text-purple-700',
    template: 'tw:border-sky-200 tw:bg-sky-50 tw:text-sky-700',
    external: 'tw:border-amber-200 tw:bg-amber-50 tw:text-amber-700',
};

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const EmailAttachmentList: React.FC = () => {
    const navigate = useNavigate();
    const vm = useEmailAttachmentListVM();

    useEffect(() => {
        vm.fetchAttachments();
    }, [vm.page, vm.rowsPerPage]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <AdminPage>
            <AdminPageHeader
                title="Email Attachments"
                actions={[
                    { label: 'Add Attachment', icon: Plus, onClick: () => navigate('/admin/email/attachments/new') },
                ]}
            />

            <AdminErrorAlert message={vm.error} />

            <AdminDataTable
                columns={[
                    {
                        key: 'name',
                        header: 'Name',
                        render: (val) => <span className="tw:font-mono tw:text-sm">{val}</span>,
                    },
                    { key: 'display_name', header: 'Display Name' },
                    {
                        key: 'attachment_type',
                        header: 'Type',
                        render: (val) => (
                            <Badge variant="outline" className={ATTACHMENT_TYPE_STYLE[val as AttachmentType] || ''}>
                                {val}
                            </Badge>
                        ),
                    },
                    {
                        key: 'file_size',
                        header: 'Size',
                        render: (val) => formatFileSize(val as number),
                    },
                    {
                        key: 'is_active',
                        header: 'Active',
                        align: 'center',
                        render: (val) => <AdminBadge active={!!val} />,
                    },
                ]}
                data={vm.attachments}
                loading={vm.loading}
                emptyMessage="No attachments found"
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

export default EmailAttachmentList;
