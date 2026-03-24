import React from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import {
    AdminPage,
    AdminPageHeader,
    AdminErrorAlert,
    AdminEmptyState,
    AdminLoadingState,
} from '@/components/admin/composed';
import { Button } from '@/components/admin/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/admin/ui/table';
import useStoreBundleListVM from './useStoreBundleListVM';
import StoreBundleProductsPanel from './StoreBundleProductsPanel.tsx';

const COL_COUNT = 9;

const AdminStoreBundleList: React.FC = () => {
    const vm = useStoreBundleListVM();
    const navigate = useNavigate();

    if (!vm.isSuperuser) return <Navigate to="/" replace />;

    return (
        <AdminPage>
            <AdminPageHeader
                title="Store Bundles"
                description={`${vm.totalCount} store bundle${vm.totalCount !== 1 ? 's' : ''} total`}
                actions={[
                    {
                        label: 'Add New Store Bundle',
                        icon: Plus,
                        onClick: () => navigate('/admin/store-bundles/new'),
                    },
                ]}
            />
            <AdminErrorAlert message={vm.error} />

            {vm.loading ? (
                <AdminLoadingState rows={5} columns={COL_COUNT} />
            ) : vm.storeBundles.length === 0 && !vm.error ? (
                <AdminEmptyState title="No store bundles found" />
            ) : (
                <div className="tw:rounded-admin tw:border tw:border-admin-border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="tw:w-[50px]" />
                                <TableHead>ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Template</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Exam Session</TableHead>
                                <TableHead>Active</TableHead>
                                <TableHead>Components</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {vm.storeBundles.map((bundle) => (
                                <React.Fragment key={bundle.id}>
                                    <TableRow className="tw:hover:bg-gray-50">
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => vm.handleToggleExpand(bundle.id)}
                                                aria-label={
                                                    vm.expandedId === bundle.id
                                                        ? `Collapse products for ${bundle.name}`
                                                        : `Expand products for ${bundle.name}`
                                                }
                                            >
                                                {vm.expandedId === bundle.id ? (
                                                    <ChevronUp className="tw:h-4 tw:w-4" />
                                                ) : (
                                                    <ChevronDown className="tw:h-4 tw:w-4" />
                                                )}
                                            </Button>
                                        </TableCell>
                                        <TableCell>{bundle.id}</TableCell>
                                        <TableCell>{bundle.name || '-'}</TableCell>
                                        <TableCell>{bundle.bundle_template_name || '-'}</TableCell>
                                        <TableCell>{bundle.subject_code || '-'}</TableCell>
                                        <TableCell>{bundle.exam_session_code || '-'}</TableCell>
                                        <TableCell>{bundle.is_active ? 'Active' : 'Inactive'}</TableCell>
                                        <TableCell>
                                            {bundle.components_count !== undefined
                                                ? bundle.components_count
                                                : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="tw:flex tw:items-center tw:gap-1">
                                                <Button
                                                    asChild
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    <Link to={`/admin/store-bundles/${bundle.id}/edit`}>
                                                        Edit
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => vm.handleDelete(bundle.id)}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    {vm.expandedId === bundle.id && (
                                        <TableRow aria-hidden="false">
                                            <TableCell colSpan={COL_COUNT} className="tw:p-0">
                                                <StoreBundleProductsPanel bundleId={bundle.id} />
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {vm.totalCount > vm.rowsPerPage && (
                <div className="tw:mt-4 tw:flex tw:items-center tw:justify-between tw:text-sm tw:text-admin-fg-muted">
                    <span>
                        Showing {vm.page * vm.rowsPerPage + 1}&ndash;
                        {Math.min((vm.page + 1) * vm.rowsPerPage, vm.totalCount)} of {vm.totalCount}
                    </span>
                    <div className="tw:flex tw:items-center tw:gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => vm.handleChangePage(e, vm.page - 1)}
                            disabled={vm.page === 0}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => vm.handleChangePage(e, vm.page + 1)}
                            disabled={(vm.page + 1) * vm.rowsPerPage >= vm.totalCount}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </AdminPage>
    );
};

export default AdminStoreBundleList;
