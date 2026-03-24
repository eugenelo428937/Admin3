import React from 'react';
import { AdminErrorAlert } from '@/components/admin/composed';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/admin/ui/table';
import { Skeleton } from '@/components/admin/ui/skeleton';
import useStoreBundleProductsPanelVM from './useStoreBundleProductsPanelVM';

interface StoreBundleProductsPanelProps {
    bundleId: number;
}

const StoreBundleProductsPanel: React.FC<StoreBundleProductsPanelProps> = ({ bundleId }) => {
    const vm = useStoreBundleProductsPanelVM(bundleId);

    if (vm.loading) {
        return (
            <div className="tw:p-4 tw:space-y-2">
                <Skeleton className="tw:h-6 tw:w-40" />
                <Skeleton className="tw:h-8 tw:w-full" />
                <Skeleton className="tw:h-8 tw:w-full" />
            </div>
        );
    }

    return (
        <div className="tw:p-4">
            <h3 className="tw:mb-2 tw:text-sm tw:font-semibold tw:text-admin-fg">
                Bundle Products
            </h3>

            <AdminErrorAlert message={vm.error} />

            {vm.bundleProducts.length === 0 && !vm.error ? (
                <p className="tw:mb-2 tw:text-sm tw:text-admin-fg-muted">
                    No products in this bundle
                </p>
            ) : (
                <Table className="tw:mb-4">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Product Code</TableHead>
                            <TableHead>Product Name</TableHead>
                            <TableHead>Variation</TableHead>
                            <TableHead>Variation Type</TableHead>
                            <TableHead>Price Type</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Sort Order</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {vm.bundleProducts.map((bp) => (
                            <TableRow key={bp.id}>
                                <TableCell>{bp.product_code}</TableCell>
                                <TableCell>{bp.product?.fullname || '-'}</TableCell>
                                <TableCell>{bp.product_variation?.name || '-'}</TableCell>
                                <TableCell>{bp.product_variation?.variation_type || '-'}</TableCell>
                                <TableCell>{bp.default_price_type || '-'}</TableCell>
                                <TableCell>{bp.quantity}</TableCell>
                                <TableCell>{bp.sort_order}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    );
};

export default StoreBundleProductsPanel;
