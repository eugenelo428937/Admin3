import React from 'react';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
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
import useSessionBundlesSummaryVM from './useSessionBundlesSummaryVM';

interface SessionBundlesSummaryProps {
  sessionId: number | null;
}

const SessionBundlesSummary: React.FC<SessionBundlesSummaryProps> = ({ sessionId }) => {
  const { bundles, loading, error } = useSessionBundlesSummaryVM({ sessionId });

  if (loading) {
    return (
      <div className="tw:flex tw:items-center tw:justify-center tw:py-4">
        <Loader2 className="tw:size-5 tw:animate-spin tw:text-admin-primary" />
      </div>
    );
  }
  if (error) return <AdminErrorAlert message={error} />;
  if (bundles.length === 0) {
    return <p className="tw:text-sm tw:text-admin-fg-muted">No bundles found.</p>;
  }

  return (
    <div>
      <div className="tw:rounded-md tw:border tw:border-admin-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Components</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bundles.map((b) => (
              <TableRow key={b.id}>
                <TableCell>{b.name}</TableCell>
                <TableCell>{b.template_name}</TableCell>
                <TableCell>{b.subject_code}</TableCell>
                <TableCell>{b.is_active ? 'Yes' : 'No'}</TableCell>
                <TableCell>{b.component_count ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="tw:mt-2 tw:text-right">
        <Button variant="link" size="sm" asChild>
          <Link to="/admin/store-bundles">View All Store Bundles</Link>
        </Button>
      </div>
    </div>
  );
};

export default SessionBundlesSummary;
