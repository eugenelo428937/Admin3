import React from 'react';
import {
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Alert,
  Paper,
  Typography,
  Box,
  CircularProgress,
  TablePagination,
} from '@mui/material';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.tsx';
import useUserProfileListVM from './useUserProfileListVM';

const AdminUserProfileList: React.FC = () => {
  const { isSuperuser } = useAuth();
  const vm = useUserProfileListVM();

  const {
    profiles,
    loading,
    error,
    page,
    rowsPerPage,
    totalCount,
    handleChangePage,
    handleChangeRowsPerPage,
  } = vm;

  if (!isSuperuser) return <Navigate to="/" replace />;
  if (loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

  return (
    <Container sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h2">User Profiles</Typography>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {profiles.length === 0 && !error ? (
        <Alert severity="info">No user profiles found.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>First Name</TableCell>
                <TableCell>Last Name</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.id} hover>
                  <TableCell>{profile.id}</TableCell>
                  <TableCell>{profile.user?.email}</TableCell>
                  <TableCell>{profile.user?.first_name}</TableCell>
                  <TableCell>{profile.user?.last_name}</TableCell>
                  <TableCell>{profile.title}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        component={Link}
                        to={`/admin/user-profiles/${profile.id}/edit`}
                        variant="contained"
                        color="warning"
                        size="small"
                      >
                        Edit
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {totalCount > rowsPerPage && (
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[25, 50, 100]}
        />
      )}
    </Container>
  );
};

export default AdminUserProfileList;
