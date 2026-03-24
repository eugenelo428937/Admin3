import React from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { AdminErrorAlert } from '@/components/admin/composed';
import { Button } from '@/components/admin/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/admin/ui/table';
import { Skeleton } from '@/components/admin/ui/skeleton';
import useStoreProductVariationsPanelVM from './useStoreProductVariationsPanelVM';
import type { StoreProduct } from '../../../types/storeProduct';

interface StoreProductVariationsPanelProps {
    catalogProductId?: number;
    storeProducts?: StoreProduct[];
    onRefresh?: () => void;
}

const StoreProductVariationsPanel: React.FC<StoreProductVariationsPanelProps> = ({
    catalogProductId,
    storeProducts,
    onRefresh,
}) => {
    const vm = useStoreProductVariationsPanelVM({
        catalogProductId,
        storeProducts,
        onRefresh,
    });

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
                Store Products (Variations)
            </h3>

            <AdminErrorAlert message={vm.error} />

            {vm.products.length === 0 && !vm.error ? (
                <p className="tw:mb-2 tw:text-sm tw:text-admin-fg-muted">
                    No store products for this catalog product
                </p>
            ) : (
                <Table className="tw:mb-4">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Product Code</TableHead>
                            <TableHead>Variation</TableHead>
                            <TableHead>Variation Type</TableHead>
                            <TableHead>Active</TableHead>
                            <TableHead className="tw:w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {vm.products.map((product) => (
                            <TableRow key={product.id}>
                                <TableCell>{product.product_code}</TableCell>
                                <TableCell>{product.variation_name || '-'}</TableCell>
                                <TableCell>{product.variation_type || '-'}</TableCell>
                                <TableCell>{product.is_active ? 'Active' : 'Inactive'}</TableCell>
                                <TableCell>
                                    <div className="tw:flex tw:items-center tw:gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon-xs"
                                            asChild
                                            aria-label="edit store product"
                                        >
                                            <Link to={`/admin/store-products/${product.id}/edit`}>
                                                <Pencil className="tw:h-4 tw:w-4" />
                                            </Link>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon-xs"
                                            onClick={() => vm.handleDelete(product.id)}
                                            aria-label="delete store product"
                                        >
                                            <Trash2 className="tw:h-4 tw:w-4 tw:text-admin-destructive" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            <Button variant="outline" size="sm" asChild>
                <Link to="/admin/store-products/new">
                    <Plus className="tw:mr-2 tw:h-4 tw:w-4" />
                    Add Store Product
                </Link>
            </Button>
        </div>
    );
};

export default StoreProductVariationsPanel;
