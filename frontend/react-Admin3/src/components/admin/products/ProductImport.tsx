import React from 'react';
import { Upload } from 'lucide-react';
import { AdminPage, AdminPageHeader } from '@/components/admin/composed';
import { Button } from '@/components/admin/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/admin/ui/table';
import useProductImportVM from './useProductImportVM';

const AdminProductImport: React.FC = () => {
  const vm = useProductImportVM();

  return (
    <AdminPage>
      <AdminPageHeader
        title="Import Products"
        breadcrumbs={[
          { label: 'Products', href: '/admin/products' },
          { label: 'Import' },
        ]}
      />

      {vm.error && (
        <div
          className="tw:mb-4 tw:rounded-admin tw:border tw:border-admin-destructive/20 tw:bg-admin-destructive/5 tw:px-4 tw:py-3 tw:text-sm tw:text-admin-destructive"
          role="alert"
        >
          {vm.error}
        </div>
      )}
      {vm.success && (
        <div
          className="tw:mb-4 tw:rounded-admin tw:border tw:border-admin-success/20 tw:bg-admin-success/5 tw:px-4 tw:py-3 tw:text-sm tw:text-admin-success"
          role="alert"
        >
          {vm.success}
        </div>
      )}

      <div className="tw:rounded-admin tw:border tw:border-admin-border tw:bg-admin-bg tw:p-6 tw:space-y-4">
        <div>
          <label className="tw:block tw:text-sm tw:font-medium tw:text-admin-fg tw:mb-2">
            Upload CSV File
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={vm.handleFileChange}
            className="tw:text-sm tw:text-admin-fg"
          />
          <p className="tw:mt-1 tw:text-xs tw:text-admin-fg-muted">
            The CSV file should include columns: code, name, description (optional), active (true/false).
          </p>
        </div>

        {vm.preview.length > 0 && (
          <div>
            <h3 className="tw:text-base tw:font-semibold tw:text-admin-fg tw:mb-2">Preview</h3>
            <div className="tw:rounded-admin tw:border tw:border-admin-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(vm.preview[0]).map((key) => (
                      <TableHead key={key}>{key}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vm.preview.map((row, i) => (
                    <TableRow key={i}>
                      {Object.values(row).map((val, j) => (
                        <TableCell key={j}>{val as string}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="tw:mt-1 tw:text-xs tw:text-admin-fg-muted">
              Showing first {vm.preview.length} rows
            </p>
          </div>
        )}

        <div className="tw:flex tw:gap-3">
          <Button
            type="submit"
            onClick={vm.handleSubmit as any}
            disabled={vm.loading || !vm.file}
          >
            <Upload className="tw:mr-2 tw:h-4 tw:w-4" />
            {vm.loading ? 'Importing...' : 'Import Products'}
          </Button>
          <Button variant="outline" onClick={vm.handleCancel}>
            Cancel
          </Button>
        </div>
      </div>

      <div className="tw:mt-6 tw:rounded-admin tw:border tw:border-admin-border tw:bg-admin-bg-muted tw:p-6">
        <h3 className="tw:text-base tw:font-semibold tw:text-admin-fg tw:mb-2">CSV Format Guide</h3>
        <p className="tw:text-sm tw:text-admin-fg-muted tw:mb-3">Your CSV file should follow this format:</p>
        <pre className="tw:rounded tw:bg-admin-bg-subtle tw:p-3 tw:border tw:border-admin-border tw:overflow-x-auto tw:text-xs tw:font-mono tw:text-admin-fg">
          code,fullname,shortname,description,active{'\n'}
          PRD001,Product One Complete Name,Prod1,This is product one,true{'\n'}
          PRD002,Product Two Complete Name,Prod2,This is product two,true{'\n'}
          PRD003,Product Three Complete Name,Prod3,This is product three,false
        </pre>
        <ul className="tw:mt-3 tw:list-disc tw:list-inside tw:text-sm tw:text-admin-fg tw:space-y-1">
          <li><strong>code</strong> - Unique product identifier (required)</li>
          <li><strong>fullname</strong> - Complete product name (required)</li>
          <li><strong>shortname</strong> - Abbreviated product name (required)</li>
          <li><strong>description</strong> - Product description (optional)</li>
          <li><strong>active</strong> - Product status (true/false)</li>
        </ul>
      </div>
    </AdminPage>
  );
};

export default AdminProductImport;
