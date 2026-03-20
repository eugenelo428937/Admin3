import React from 'react';
import {
  Container, Card, CardHeader, CardContent, CardActions,
  Button, Alert, Box, Typography, CircularProgress
} from '@mui/material';
import { Link, Navigate } from 'react-router-dom';
import useSubjectDetailVM from './useSubjectDetailVM';

const AdminSubjectDetail: React.FC = () => {
  const vm = useSubjectDetailVM();

  if (!vm.isSuperuser) return <Navigate to="/" replace />;
  if (vm.loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;
  if (vm.error) return <Alert severity="error" sx={{ mt: 4 }}>{vm.error}</Alert>;
  if (!vm.subject) return <Alert severity="warning" sx={{ mt: 4 }}>Subject not found.</Alert>;

  return (
    <Container sx={{ mt: 4 }}>
      <Card>
        <CardHeader title={vm.subject.code} titleTypographyProps={{ variant: 'h4' }} />
        <CardContent>
          <Typography sx={{ mb: 2 }}>
            <strong>Description:</strong> {vm.subject.description || 'No description available.'}
          </Typography>
          <Typography sx={{ mb: 2 }}>
            <strong>Status:</strong> {vm.subject.active ? 'Active' : 'Inactive'}
          </Typography>
          <Typography sx={{ mb: 2 }}>
            <strong>Created:</strong> {new Date(vm.subject.created_at).toLocaleString()}
          </Typography>
          <Typography sx={{ mb: 2 }}>
            <strong>Last Updated:</strong> {new Date(vm.subject.updated_at).toLocaleString()}
          </Typography>
        </CardContent>
        <CardActions sx={{ display: 'flex', justifyContent: 'space-between', p: 2 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button component={Link} to={`/admin/subjects/${vm.id}/edit`} variant="contained">
              Edit
            </Button>
            <Button variant="contained" color="error" onClick={vm.handleDelete}>
              Delete
            </Button>
          </Box>
          <Button variant="outlined" onClick={vm.handleBack}>
            Back to Subjects
          </Button>
        </CardActions>
      </Card>
    </Container>
  );
};

export default AdminSubjectDetail;
