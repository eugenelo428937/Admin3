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
import useSessionBundlesSummaryVM from './useSessionBundlesSummaryVM';

// ─── Interfaces ───────────────────────────────────────────────

interface SessionBundlesSummaryProps {
  sessionId: number | null;
}

// ─── Component ────────────────────────────────────────────────

const SessionBundlesSummary: React.FC<SessionBundlesSummaryProps> = ({ sessionId }) => {
  const { bundles, loading, error } = useSessionBundlesSummaryVM({ sessionId });

  if (loading) return <CircularProgress size={24} />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (bundles.length === 0) return <Typography variant="body2">No bundles found.</Typography>;

  return (
    <Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Template</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Active</TableCell>
              <TableCell>Components</TableCell>
            </TableRow>
          </TableHead>
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
      </TableContainer>
      <Box sx={{ mt: 1, textAlign: 'right' }}>
        <Button component={Link} to="/admin/store-bundles" size="small">
          View All Store Bundles
        </Button>
      </Box>
    </Box>
  );
};

export default SessionBundlesSummary;
