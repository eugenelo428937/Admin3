import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Box,
  Button,
} from '@mui/material';
import { Link } from 'react-router-dom';
import useSessionProductsSummaryVM from './useSessionProductsSummaryVM';

// ─── Interfaces ───────────────────────────────────────────────

interface SessionProductsSummaryProps {
  sessionId: number | null;
}

// ─── Component ────────────────────────────────────────────────

const SessionProductsSummary: React.FC<SessionProductsSummaryProps> = ({ sessionId }) => {
  const { products, loading, error } = useSessionProductsSummaryVM({ sessionId });

  if (loading) return <CircularProgress size={24} />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (products.length === 0) return <Typography variant="body2">No products found.</Typography>;

  return (
    <Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Product Code</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Variation</TableCell>
              <TableCell>Active</TableCell>
            </TableRow>
          </TableHead>
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
      </TableContainer>
      <Box sx={{ mt: 1, textAlign: 'right' }}>
        <Button component={Link} to="/admin/store-products" size="small">
          View All Store Products
        </Button>
      </Box>
    </Box>
  );
};

export default SessionProductsSummary;
