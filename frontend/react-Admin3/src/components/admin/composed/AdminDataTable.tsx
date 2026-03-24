import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, type LucideIcon } from 'lucide-react';
import { cn } from '@/components/admin/styles/cn';
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
import { AdminLoadingState } from './AdminLoadingState';
import { AdminEmptyState } from './AdminEmptyState';

interface SimpleColumn<T> {
  key: keyof T & string;
  header: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
}

interface RowAction<T> {
  label: string;
  icon?: LucideIcon;
  variant?: 'default' | 'destructive';
  onClick: () => void;
}

interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onPageSizeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  pageSizeOptions?: number[];
}

interface AdminDataTableProps<T extends Record<string, any>> {
  columns: SimpleColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
  pagination?: PaginationConfig;
  actions?: (row: T) => RowAction<T>[];
  onRowClick?: (row: T) => void;
  className?: string;
}

function AdminDataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No results found',
  emptyIcon,
  pagination,
  actions,
  onRowClick,
  className,
}: AdminDataTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  // Adapt SimpleColumn to TanStack ColumnDef
  const tanstackColumns = React.useMemo<ColumnDef<T>[]>(() => {
    const cols: ColumnDef<T>[] = columns.map((col) => ({
      accessorKey: col.key,
      header: ({ column }) => {
        if (!col.sortable) {
          return <span>{col.header}</span>;
        }
        return (
          <Button
            variant="ghost"
            size="sm"
            className="tw:-ml-3 tw:h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            {col.header}
            <ArrowUpDown className="tw:ml-1 tw:size-3.5" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const value = row.getValue(col.key);
        if (col.render) {
          return col.render(value, row.original);
        }
        return <span className={col.className}>{String(value ?? '')}</span>;
      },
    }));

    if (actions) {
      cols.push({
        id: '_actions',
        header: () => <span className="tw:sr-only">Actions</span>,
        cell: ({ row }) => {
          const rowActions = actions(row.original);
          if (rowActions.length === 0) return null;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs">
                  <MoreHorizontal className="tw:size-4" />
                  <span className="tw:sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {rowActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <DropdownMenuItem
                      key={action.label}
                      variant={action.variant === 'destructive' ? 'destructive' : 'default'}
                      onClick={(e) => {
                        e.stopPropagation();
                        action.onClick();
                      }}
                    >
                      {Icon && <Icon className="tw:size-4" />}
                      {action.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        enableSorting: false,
      });
    }

    return cols;
  }, [columns, actions]);

  const table = useReactTable({
    data,
    columns: tanstackColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (loading) {
    return <AdminLoadingState rows={5} columns={columns.length} className={className} />;
  }

  if (data.length === 0) {
    return (
      <AdminEmptyState
        title={emptyMessage}
        icon={emptyIcon}
        className={className}
      />
    );
  }

  // Pagination calculations
  const startIdx = pagination ? pagination.page * pagination.pageSize + 1 : 1;
  const endIdx = pagination
    ? Math.min((pagination.page + 1) * pagination.pageSize, pagination.total)
    : data.length;

  return (
    <div className={cn('tw:space-y-4', className)}>
      <div className="tw:rounded-md tw:border tw:border-admin-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                className={onRowClick ? 'tw:cursor-pointer' : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <div className="tw:flex tw:items-center tw:justify-between tw:px-2 tw:text-sm tw:text-admin-fg-muted">
          <span>
            Showing {startIdx}&ndash;{endIdx} of {pagination.total}
          </span>
          <div className="tw:flex tw:items-center tw:gap-4">
            <div className="tw:flex tw:items-center tw:gap-2">
              <span>Rows per page</span>
              <select
                className="tw:h-8 tw:rounded-md tw:border tw:border-admin-border tw:bg-transparent tw:px-2 tw:text-sm"
                value={pagination.pageSize}
                onChange={(e) => pagination.onPageSizeChange(e as unknown as React.ChangeEvent<HTMLInputElement>)}
              >
                {(pagination.pageSizeOptions ?? [10, 20, 50]).map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <div className="tw:flex tw:items-center tw:gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 0}
                onClick={(e) => pagination.onPageChange(e, pagination.page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={endIdx >= pagination.total}
                onClick={(e) => pagination.onPageChange(e, pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { AdminDataTable };
export type {
  AdminDataTableProps,
  SimpleColumn,
  RowAction,
  PaginationConfig,
};
