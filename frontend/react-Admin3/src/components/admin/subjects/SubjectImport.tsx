import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload } from 'lucide-react';
import { AdminPage, AdminPageHeader } from '@/components/admin/composed';
import { Button } from '@/components/admin/ui/button';
import { Input } from '@/components/admin/ui/input';
import useSubjectImportVM from './useSubjectImportVM';

const AdminSubjectImport: React.FC = () => {
  const vm = useSubjectImportVM();
  const navigate = useNavigate();

  return (
    <AdminPage>
      <AdminPageHeader
        title="Import Subjects"
        breadcrumbs={[
          { label: 'Subjects', href: '/admin/subjects' },
          { label: 'Import' },
        ]}
      />

      {vm.message && (
        <div
          className={`tw:mb-4 tw:rounded-admin tw:border tw:px-4 tw:py-3 tw:text-sm ${
            vm.isError
              ? 'tw:border-admin-destructive/20 tw:bg-admin-destructive/5 tw:text-admin-destructive'
              : 'tw:border-admin-success/20 tw:bg-admin-success/5 tw:text-admin-success'
          }`}
          role="alert"
        >
          {vm.message}
        </div>
      )}

      <div className="tw:rounded-admin tw:border tw:border-admin-border tw:bg-admin-bg tw:p-6 tw:space-y-4">
        <div>
          <label className="tw:block tw:text-sm tw:font-medium tw:text-admin-fg tw:mb-2">
            CSV File
          </label>
          <Input
            type="file"
            accept=".csv"
            onChange={vm.handleFileChange}
          />
        </div>

        <div className="tw:flex tw:gap-3">
          <Button onClick={vm.handleImport} disabled={!vm.file || vm.loading}>
            <Upload className="tw:mr-2 tw:h-4 tw:w-4" />
            {vm.loading ? 'Importing...' : 'Import CSV'}
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/subjects')}>
            Cancel
          </Button>
        </div>
      </div>

      <div className="tw:mt-6 tw:rounded-admin tw:border tw:border-admin-border tw:bg-admin-bg-muted tw:p-6">
        <h3 className="tw:text-base tw:font-semibold tw:text-admin-fg tw:mb-2">CSV Format</h3>
        <p className="tw:text-sm tw:text-admin-fg-muted tw:mb-3">Your CSV file should have the following columns:</p>
        <ol className="tw:list-decimal tw:list-inside tw:text-sm tw:text-admin-fg tw:space-y-1">
          <li>Code (required)</li>
          <li>Description (required)</li>
          <li>Active (optional, default: true)</li>
        </ol>
        <p className="tw:mt-3 tw:text-sm tw:text-admin-fg-muted">
          Example: <code className="tw:rounded tw:bg-admin-bg-subtle tw:px-1.5 tw:py-0.5 tw:font-mono tw:text-xs">MATH101,Basic Mathematics,true</code>
        </p>
      </div>
    </AdminPage>
  );
};

export default AdminSubjectImport;
