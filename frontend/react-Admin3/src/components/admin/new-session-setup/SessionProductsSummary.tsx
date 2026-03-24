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
import useSessionProductsSummaryVM from './useSessionProductsSummaryVM';

interface SessionProductsSummaryProps {
  sessionId: number | null;
}

const SessionProductsSummary: React.FC<SessionProductsSummaryProps> = ({ sessionId }) => {
  const { products, loading, error } = useSessionProductsSummaryVM({ sessionId });

  if (loading) {
    return (
      <div className="tw:flex tw:items-center tw:justify-center tw:py-4">
        <Loader2 className="tw:size-5 tw:animate-spin tw:text-admin-primary" />
      </div>
    );
  }
  if (error) return <AdminErrorAlert message={error} />;
  if (products.length === 0) {
    return <p className="tw:text-sm tw:text-admin-fg-muted">No products found.</p>;
  }

  return (
    <div>
      <div className="tw:rounded-admin tw:border tw:border-admin-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Code</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Variation</TableHead>
              <TableHead>Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.product_code}</TableCell>
                <TableCell>{p.subject_code}</TableCell>
                <TableCell>{p.product_name}</TableCell>
                <TableCell>{p.variation_name}</TableCell>
                <TableCell>{p.is_active ? 'Yes' : 'No'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="tw:mt-2 tw:text-right">
        <Button variant="link" size="sm" asChild>
          <Link to="/admin/store-products">View All Store Products</Link>
        </Button>
      </div>
    </div>
  );
};

export default SessionProductsSummary;
