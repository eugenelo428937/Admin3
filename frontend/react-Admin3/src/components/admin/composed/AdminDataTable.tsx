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
import { AdminPagination } from './AdminPagination';

interface SimpleColumn<T> {
  key: keyof T & string;
  id?: string;
  header: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
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
      id: col.id ?? col.key,
      accessorKey: col.key,
      meta: { align: col.align },
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
        const value = row.getValue(col.id ?? col.key);
        const content = col.render
          ? col.render(value, row.original)
          : <span className={col.className}>{String(value ?? '')}</span>;
        if (col.align === 'center') {
          return <div className="tw:flex tw:justify-center">{content}</div>;
        }
        if (col.align === 'right') {
          return <div className="tw:flex tw:justify-end">{content}</div>;
        }
        return content;
      },
    }));

    if (actions) {
      cols.push({
        id: '_actions',
        meta: { align: 'center' },
        header: () => <span className="tw:sr-only">Actions</span>,
        cell: ({ row }) => {
          const rowActions = actions(row.original);
          if (rowActions.length === 0) return null;
          return (
            <div className="tw:flex tw:justify-center">
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-xs">
                    <MoreHorizontal className="tw:size-4" />
                    <span className="tw:sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={4}>
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
            </div>
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

  return (
    <div className={cn('tw:space-y-4', className)}>
      <div className="tw:rounded-md tw:border tw:border-admin-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const align = (header.column.columnDef.meta as any)?.align as string | undefined;
                  return (
                    <TableHead
                      key={header.id}
                      style={align ? { textAlign: align as any } : undefined}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
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
                {row.getVisibleCells().map((cell) => {
                  const align = (cell.column.columnDef.meta as any)?.align as string | undefined;
                  return (
                    <TableCell
                      key={cell.id}
                      style={align ? { textAlign: align as any } : undefined}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <AdminPagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={(e) =>
            pagination.onPageSizeChange(e as unknown as React.ChangeEvent<HTMLInputElement>)
          }
          pageSizeOptions={pagination.pageSizeOptions}
        />
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
