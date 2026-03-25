import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react';
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
import { AdminBadge } from '@/components/admin/composed';
import ProductVariationsPanel from './ProductVariationsPanel.tsx';
import type { Product } from '../../../types/product';

interface ProductTableProps {
  products: Product[];
  onDelete: (id: number | string) => Promise<void>;
}

const AdminProductTable: React.FC<ProductTableProps> = ({ products, onDelete }) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleToggleExpand = (productId: number) => {
    setExpandedId((prev) => (prev === productId ? null : productId));
  };

  return (
    <div className="tw:rounded-md tw:border tw:border-admin-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="tw:w-[50px]" />
            <TableHead>Code</TableHead>
            <TableHead>Full Name</TableHead>
            <TableHead>Short Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead style={{ textAlign: 'center' }}>Active</TableHead>
            <TableHead>Buy Both</TableHead>
            <TableHead className="tw:w-[50px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <React.Fragment key={product.id}>
              <TableRow>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleToggleExpand(product.id)}
                    aria-label={
                      expandedId === product.id
                        ? `Collapse variations for ${product.code}`
                        : `Expand variations for ${product.code}`
                    }
                  >
                    {expandedId === product.id ? (
                      <ChevronUp className="tw:h-4 tw:w-4" />
                    ) : (
                      <ChevronDown className="tw:h-4 tw:w-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell>{product.code}</TableCell>
                <TableCell>{product.fullname}</TableCell>
                <TableCell>{product.shortname}</TableCell>
                <TableCell className="tw:max-w-[200px] tw:overflow-hidden tw:text-ellipsis tw:whitespace-nowrap">
                  {product.description || '-'}
                </TableCell>
                <TableCell style={{ textAlign: 'center' }}>
                  <div className="tw:flex tw:justify-center">
                    <AdminBadge active={product.is_active} />
                  </div>
                </TableCell>
                <TableCell>{product.buy_both ? 'Yes' : 'No'}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="Open menu">
                        <MoreHorizontal className="tw:h-4 tw:w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/admin/products/${product.id}`}>
                          <Eye className="tw:mr-2 tw:h-4 tw:w-4" /> View
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/admin/products/${product.id}/edit`}>
                          <Pencil className="tw:mr-2 tw:h-4 tw:w-4" /> Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="tw:text-admin-destructive"
                        onClick={() => onDelete(product.id)}
                      >
                        <Trash2 className="tw:mr-2 tw:h-4 tw:w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
              {expandedId === product.id && (
                <TableRow>
                  <TableCell colSpan={8} className="tw:p-0">
                    <ProductVariationsPanel productId={product.id} />
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default AdminProductTable;
