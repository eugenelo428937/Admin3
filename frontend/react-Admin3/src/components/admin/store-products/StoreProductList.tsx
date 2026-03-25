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
import useStoreProductListVM from './useStoreProductListVM';
import StoreProductVariationsPanel from './StoreProductVariationsPanel.tsx';

const COL_COUNT = 5;

const AdminStoreProductList: React.FC = () => {
    const vm = useStoreProductListVM();
    const navigate = useNavigate();

    if (!vm.isSuperuser) return <Navigate to="/" replace />;

    return (
        <AdminPage>
            <AdminPageHeader
                title="Store Products"
                description={`${vm.totalCount} store product${vm.totalCount !== 1 ? 's' : ''} total`}
                actions={[
                    {
                        label: 'Add New Store Product',
                        icon: Plus,
                        onClick: () => navigate('/admin/store-products/new'),
                    },
                ]}
            />
            <AdminErrorAlert message={vm.error} />

            {vm.loading ? (
                <AdminLoadingState rows={5} columns={COL_COUNT} />
            ) : vm.pageProducts.length === 0 && !vm.error ? (
                <AdminEmptyState title="No store products found" />
            ) : (
                <div className="tw:rounded-md tw:border tw:border-admin-border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="tw:w-[50px]" />
                                <TableHead>Product Code</TableHead>
                                <TableHead>Product Name</TableHead>
                                <TableHead>Variations</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {vm.sortedSessions.map((sessionCode) => {
                                const subjects = vm.groupedData[sessionCode];
                                const sortedSubjects = Object.keys(subjects).sort();
                                const sessionExpanded = !vm.expandedSessions[sessionCode];
                                const sessionProductCount = vm.countSessionProducts(subjects);

                                return (
                                    <React.Fragment key={sessionCode}>
                                        <TableRow
                                            className="tw:cursor-pointer"
                                            onClick={() => vm.toggleSession(sessionCode)}
                                        >
                                            <TableCell
                                                colSpan={COL_COUNT}
                                                className="tw:bg-admin-primary tw:text-white tw:py-2"
                                            >
                                                <div className="tw:flex tw:items-center tw:gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        className="tw:text-white tw:hover:bg-white/20 tw:hover:text-white tw:p-0.5"
                                                        aria-label={
                                                            sessionExpanded
                                                                ? `Collapse session ${sessionCode}`
                                                                : `Expand session ${sessionCode}`
                                                        }
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            vm.toggleSession(sessionCode);
                                                        }}
                                                    >
                                                        {sessionExpanded ? (
                                                            <ChevronUp className="tw:h-4 tw:w-4" />
                                                        ) : (
                                                            <ChevronDown className="tw:h-4 tw:w-4" />
                                                        )}
                                                    </Button>
                                                    <span className="tw:text-sm tw:font-bold">
                                                        Exam Session: {sessionCode}
                                                    </span>
                                                    <span className="tw:text-xs tw:opacity-80">
                                                        ({sortedSubjects.length} subject{sortedSubjects.length !== 1 ? 's' : ''},{' '}
                                                        {sessionProductCount} product{sessionProductCount !== 1 ? 's' : ''})
                                                    </span>
                                                </div>
                                            </TableCell>
                                        </TableRow>

                                        {sessionExpanded &&
                                            sortedSubjects.map((subjectCode) => {
                                                const products = subjects[subjectCode];
                                                const subjectKey = `${sessionCode}-${subjectCode}`;
                                                const subjectExpanded = !!vm.expandedSubjects[subjectKey];
                                                const sortedProducts = Object.values(products).sort(
                                                    (a: any, b: any) =>
                                                        (a.catalog_product_code || '').localeCompare(
                                                            b.catalog_product_code || ''
                                                        )
                                                ) as any[];
                                                const subjectProductCount = vm.countSubjectProducts(products);

                                                return (
                                                    <React.Fragment key={subjectKey}>
                                                        <TableRow
                                                            className="tw:cursor-pointer"
                                                            onClick={() => vm.toggleSubject(subjectKey)}
                                                        >
                                                            <TableCell
                                                                colSpan={COL_COUNT}
                                                                className="tw:bg-muted tw:py-1.5 tw:pl-8"
                                                            >
                                                                <div className="tw:flex tw:items-center tw:gap-2">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon-sm"
                                                                        className="tw:p-0.5"
                                                                        aria-label={
                                                                            subjectExpanded
                                                                                ? `Collapse subject ${subjectCode}`
                                                                                : `Expand subject ${subjectCode}`
                                                                        }
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            vm.toggleSubject(subjectKey);
                                                                        }}
                                                                    >
                                                                        {subjectExpanded ? (
                                                                            <ChevronUp className="tw:h-4 tw:w-4" />
                                                                        ) : (
                                                                            <ChevronDown className="tw:h-4 tw:w-4" />
                                                                        )}
                                                                    </Button>
                                                                    <span className="tw:text-sm tw:font-bold">
                                                                        Subject: {subjectCode}
                                                                    </span>
                                                                    <span className="tw:text-xs tw:text-admin-fg-muted">
                                                                        ({sortedProducts.length} product{sortedProducts.length !== 1 ? 's' : ''},{' '}
                                                                        {subjectProductCount} variation{subjectProductCount !== 1 ? 's' : ''})
                                                                    </span>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>

                                                        {subjectExpanded &&
                                                            sortedProducts.map((product: any) => {
                                                                const expandKey = `${sessionCode}-${subjectCode}-${product.catalog_product_id}`;

                                                                return (
                                                                    <React.Fragment key={expandKey}>
                                                                        <TableRow className="tw:hover:bg-muted/50">
                                                                            <TableCell>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon-sm"
                                                                                    onClick={() =>
                                                                                        vm.toggleProduct(expandKey)
                                                                                    }
                                                                                    aria-label={
                                                                                        vm.expandedProduct === expandKey
                                                                                            ? `Collapse variations for ${product.catalog_product_code}`
                                                                                            : `Expand variations for ${product.catalog_product_code}`
                                                                                    }
                                                                                >
                                                                                    {vm.expandedProduct === expandKey ? (
                                                                                        <ChevronUp className="tw:h-4 tw:w-4" />
                                                                                    ) : (
                                                                                        <ChevronDown className="tw:h-4 tw:w-4" />
                                                                                    )}
                                                                                </Button>
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                {product.catalog_product_code || '-'}
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                {product.product_name || '-'}
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                {product.variations.length}
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                {product.catalog_product_id && (
                                                                                    <Button
                                                                                        asChild
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                    >
                                                                                        <Link
                                                                                            to={`/admin/products/${product.catalog_product_id}`}
                                                                                        >
                                                                                            View
                                                                                        </Link>
                                                                                    </Button>
                                                                                )}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                        {vm.expandedProduct === expandKey && (
                                                                            <TableRow>
                                                                                <TableCell
                                                                                    colSpan={COL_COUNT}
                                                                                    className="tw:p-0"
                                                                                >
                                                                                    <StoreProductVariationsPanel
                                                                                        storeProducts={product.variations}
                                                                                        onRefresh={vm.fetchProducts}
                                                                                    />
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        )}
                                                                    </React.Fragment>
                                                                );
                                                            })}
                                                    </React.Fragment>
                                                );
                                            })}
                                    </React.Fragment>
                                );
                            })}
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

export default AdminStoreProductList;
