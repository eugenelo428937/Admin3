import React from 'react';
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react';
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
import useBundleProductsPanelVM from './useBundleProductsPanelVM';
import type { Product, ProductProductVariation } from '../../../types/product';

interface BundleProductsPanelProps {
    bundleId: number;
}

const BundleProductsPanel: React.FC<BundleProductsPanelProps> = ({ bundleId }) => {
    const vm = useBundleProductsPanelVM(bundleId);

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
                            <TableHead>Product</TableHead>
                            <TableHead>Product Code</TableHead>
                            <TableHead>Variation</TableHead>
                            <TableHead>Variation Code</TableHead>
                            <TableHead className="tw:w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {vm.bundleProducts.map((bp) => (
                            <TableRow key={bp.id}>
                                {vm.editingId === bp.id ? (
                                    <>
                                        <TableCell colSpan={2}>
                                            <select
                                                className="tw:w-full tw:rounded-md tw:border tw:border-input tw:bg-transparent tw:px-3 tw:py-1.5 tw:text-sm tw:shadow-xs"
                                                value={vm.editProduct?.id ?? ''}
                                                onChange={(e) => {
                                                    const productId = Number(e.target.value);
                                                    const product =
                                                        vm.allProducts.find(
                                                            (p: Product) => p.id === productId
                                                        ) || null;
                                                    vm.setEditProduct(product);
                                                }}
                                                aria-label="Select product"
                                            >
                                                <option value="">Select product</option>
                                                {vm.allProducts.map((p: Product) => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.shortname} ({p.code})
                                                    </option>
                                                ))}
                                            </select>
                                        </TableCell>
                                        <TableCell colSpan={2}>
                                            <select
                                                className="tw:w-full tw:rounded-md tw:border tw:border-input tw:bg-transparent tw:px-3 tw:py-1.5 tw:text-sm tw:shadow-xs"
                                                value={vm.editVariation?.id ?? ''}
                                                onChange={(e) => {
                                                    const variationId = Number(e.target.value);
                                                    const variation =
                                                        vm.editVariationOptions.find(
                                                            (v: ProductProductVariation) =>
                                                                v.id === variationId
                                                        ) || null;
                                                    vm.setEditVariation(variation);
                                                }}
                                                disabled={!vm.editProduct}
                                                aria-label="Select variation"
                                            >
                                                <option value="">Select variation</option>
                                                {vm.editVariationOptions.map(
                                                    (v: ProductProductVariation) => (
                                                        <option key={v.id} value={v.id}>
                                                            {v.variation_name} ({v.variation_code})
                                                        </option>
                                                    )
                                                )}
                                            </select>
                                        </TableCell>
                                        <TableCell>
                                            <div className="tw:flex tw:items-center tw:gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-xs"
                                                    onClick={() => vm.handleEditSave(bp.id)}
                                                    aria-label="save edit"
                                                >
                                                    <Check className="tw:h-4 tw:w-4 tw:text-green-600" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-xs"
                                                    onClick={vm.handleEditCancel}
                                                    aria-label="cancel edit"
                                                >
                                                    <X className="tw:h-4 tw:w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </>
                                ) : (
                                    <>
                                        <TableCell>{bp.product_name}</TableCell>
                                        <TableCell>{bp.product_code}</TableCell>
                                        <TableCell>{bp.variation_name}</TableCell>
                                        <TableCell>{bp.variation_code}</TableCell>
                                        <TableCell>
                                            <div className="tw:flex tw:items-center tw:gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-xs"
                                                    onClick={() => vm.handleEditStart(bp)}
                                                    aria-label="edit product"
                                                >
                                                    <Pencil className="tw:h-4 tw:w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-xs"
                                                    onClick={() => vm.handleRemove(bp.id)}
                                                    aria-label="remove product"
                                                >
                                                    <Trash2 className="tw:h-4 tw:w-4 tw:text-admin-destructive" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            {/* Add new product row */}
            <div className="tw:flex tw:items-center tw:gap-2">
                <select
                    className="tw:min-w-[220px] tw:rounded-md tw:border tw:border-input tw:bg-transparent tw:px-3 tw:py-1.5 tw:text-sm tw:shadow-xs"
                    value={vm.addProduct?.id ?? ''}
                    onChange={(e) => {
                        const productId = Number(e.target.value);
                        const product =
                            vm.allProducts.find((p: Product) => p.id === productId) || null;
                        vm.setAddProduct(product);
                    }}
                    aria-label="Select product"
                >
                    <option value="">Select product</option>
                    {vm.allProducts.map((p: Product) => (
                        <option key={p.id} value={p.id}>
                            {p.shortname} ({p.code})
                        </option>
                    ))}
                </select>
                <select
                    className="tw:min-w-[220px] tw:rounded-md tw:border tw:border-input tw:bg-transparent tw:px-3 tw:py-1.5 tw:text-sm tw:shadow-xs"
                    value={vm.addVariation?.id ?? ''}
                    onChange={(e) => {
                        const variationId = Number(e.target.value);
                        const variation =
                            vm.addVariationOptions.find(
                                (v: ProductProductVariation) => v.id === variationId
                            ) || null;
                        vm.setAddVariation(variation);
                    }}
                    disabled={!vm.addProduct}
                    aria-label="Select variation"
                >
                    <option value="">Select variation</option>
                    {vm.addVariationOptions.map((v: ProductProductVariation) => (
                        <option key={v.id} value={v.id}>
                            {v.variation_name} ({v.variation_code})
                        </option>
                    ))}
                </select>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={vm.handleAdd}
                    disabled={!vm.addVariation}
                    aria-label="add product to bundle"
                >
                    <Plus className="tw:h-4 tw:w-4" />
                </Button>
            </div>
        </div>
    );
};

export default BundleProductsPanel;
