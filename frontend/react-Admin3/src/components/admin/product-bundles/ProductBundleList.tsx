import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, MoreHorizontal } from 'lucide-react';
import {
    AdminPage,
    AdminPageHeader,
    AdminBadge,
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/admin/ui/dropdown-menu';
import useProductBundleListVM from './useProductBundleListVM';
import BundleProductsPanel from './BundleProductsPanel';
import type { ProductBundle } from '../../../types/productBundle';

const AdminProductBundleList: React.FC = () => {
    const vm = useProductBundleListVM();
    const navigate = useNavigate();

    if (!vm.isSuperuser) return <Navigate to="/" replace />;

    return (
        <AdminPage>
            <AdminPageHeader
                title="Product Bundles"
                actions={[
                    {
                        label: 'Create New Product Bundle',
                        icon: Plus,
                        onClick: () => navigate('/admin/product-bundles/new'),
                    },
                ]}
            />
            <AdminErrorAlert message={vm.error} />

            {vm.loading ? (
                <AdminLoadingState rows={5} columns={6} />
            ) : vm.bundles.length === 0 && !vm.error ? (
                <AdminEmptyState title="No product bundles found" />
            ) : (
                <div className="tw:rounded-md tw:border tw:border-admin-border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="tw:w-[50px]" />
                                <TableHead>ID</TableHead>
                                <TableHead>Bundle Name</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Featured</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="tw:w-[50px]" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.isArray(vm.bundles) &&
                                vm.bundles.map((bundle: ProductBundle) => (
                                    <React.Fragment key={bundle.id}>
                                        <TableRow>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() =>
                                                        vm.handleToggleExpand(bundle.id)
                                                    }
                                                    aria-label={
                                                        vm.expandedId === bundle.id
                                                            ? `Collapse products for ${bundle.bundle_name}`
                                                            : `Expand products for ${bundle.bundle_name}`
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
                                            <TableCell>
                                                {bundle.bundle_name || '-'}
                                            </TableCell>
                                            <TableCell>
                                                {(
                                                    bundle.subject as {
                                                        id: number;
                                                        code: string;
                                                    }
                                                )?.code || '-'}
                                            </TableCell>
                                            <TableCell>
                                                {bundle.is_featured ? 'Yes' : 'No'}
                                            </TableCell>
                                            <TableCell>
                                                <AdminBadge active={bundle.is_active} />
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            aria-label="Open menu"
                                                        >
                                                            <MoreHorizontal className="tw:h-4 tw:w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                navigate(
                                                                    `/admin/product-bundles/${bundle.id}/edit`
                                                                )
                                                            }
                                                        >
                                                            <Pencil className="tw:mr-2 tw:h-4 tw:w-4" />{' '}
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="tw:text-admin-destructive"
                                                            onClick={() =>
                                                                vm.handleDelete(bundle.id)
                                                            }
                                                        >
                                                            <Trash2 className="tw:mr-2 tw:h-4 tw:w-4" />{' '}
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                        {vm.expandedId === bundle.id && (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={7}
                                                    className="tw:p-0"
                                                >
                                                    <BundleProductsPanel
                                                        bundleId={bundle.id}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Pagination */}
            {vm.totalCount > vm.rowsPerPage && (
                <div className="tw:mt-4 tw:flex tw:items-center tw:justify-between tw:text-sm tw:text-admin-fg-muted">
                    <span>
                        Showing {vm.page * vm.rowsPerPage + 1}&ndash;
                        {Math.min(
                            (vm.page + 1) * vm.rowsPerPage,
                            vm.totalCount
                        )}{' '}
                        of {vm.totalCount}
                    </span>
                    <div className="tw:flex tw:items-center tw:gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) =>
                                vm.handleChangePage(e, vm.page - 1)
                            }
                            disabled={vm.page === 0}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) =>
                                vm.handleChangePage(e, vm.page + 1)
                            }
                            disabled={
                                (vm.page + 1) * vm.rowsPerPage >=
                                vm.totalCount
                            }
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </AdminPage>
    );
};

export default AdminProductBundleList;
