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
import useProductVariationsPanelVM from './useProductVariationsPanelVM';

interface ProductVariationsPanelProps {
  productId: number;
}

const ProductVariationsPanel: React.FC<ProductVariationsPanelProps> = ({ productId }) => {
  const vm = useProductVariationsPanelVM(productId);

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
        Product Variations
      </h3>

      <AdminErrorAlert message={vm.error} />

      {vm.variations.length === 0 && !vm.error ? (
        <p className="tw:mb-2 tw:text-sm tw:text-admin-fg-muted">
          No variations assigned
        </p>
      ) : (
        <Table className="tw:mb-4">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="tw:w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vm.variations.map((ppv) => (
              <TableRow key={ppv.id}>
                {vm.editingId === ppv.id ? (
                  <>
                    <TableCell colSpan={3}>
                      <select
                        className="tw:w-full tw:rounded-md tw:border tw:border-input tw:bg-transparent tw:px-3 tw:py-1.5 tw:text-sm tw:shadow-xs"
                        value={vm.editVariation?.id ?? ''}
                        onChange={(e) => {
                          const variationId = Number(e.target.value);
                          const variation =
                            vm.getUnassignedVariations(ppv.product_variation).find(
                              (v) => v.id === variationId
                            ) || null;
                          vm.setEditVariation(variation);
                        }}
                        aria-label="Select variation"
                      >
                        <option value="">Select variation</option>
                        {vm.getUnassignedVariations(ppv.product_variation).map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} ({v.code})
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <div className="tw:flex tw:items-center tw:gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => vm.handleEditSave(ppv.id)}
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
                    <TableCell>{ppv.variation_name}</TableCell>
                    <TableCell>{ppv.variation_code}</TableCell>
                    <TableCell>{ppv.variation_type}</TableCell>
                    <TableCell>
                      <div className="tw:flex tw:items-center tw:gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => vm.handleEditStart(ppv)}
                          aria-label="edit variation"
                        >
                          <Pencil className="tw:h-4 tw:w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => vm.handleRemove(ppv.id)}
                          aria-label="remove variation"
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

      {/* Add new variation row */}
      <div className="tw:flex tw:items-center tw:gap-2">
        <select
          className="tw:min-w-[250px] tw:rounded-md tw:border tw:border-input tw:bg-transparent tw:px-3 tw:py-1.5 tw:text-sm tw:shadow-xs"
          value={vm.addVariation?.id ?? ''}
          onChange={(e) => {
            const variationId = Number(e.target.value);
            const variation =
              vm.getUnassignedVariations().find((v) => v.id === variationId) || null;
            vm.setAddVariation(variation);
          }}
          aria-label="Add variation"
        >
          <option value="">Add variation</option>
          {vm.getUnassignedVariations().map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} ({v.code})
            </option>
          ))}
        </select>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={vm.handleAdd}
          disabled={!vm.addVariation}
          aria-label="add variation"
        >
          <Plus className="tw:h-4 tw:w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ProductVariationsPanel;
