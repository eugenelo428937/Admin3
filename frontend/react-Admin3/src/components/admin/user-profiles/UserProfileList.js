// src/components/admin/user-profiles/UserProfileList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Alert, Paper, Typography, Box, CircularProgress, TablePagination
} from '@mui/material';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import userProfileService from '../../../services/userProfileService';

const AdminUserProfileList = () => {
  const { isSuperuser } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const { results, count } = await userProfileService.list({
        page: page + 1,
        page_size: rowsPerPage,
      });
      setProfiles(results);
      setTotalCount(count);
      setError(null);
    } catch (err) {
      console.error('Error fetching user profiles:', err);
      setError('Failed to fetch user profiles. Please try again later.');
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

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
                  <TableCell>{profile.user_email}</TableCell>
                  <TableCell>{profile.user_first_name}</TableCell>
                  <TableCell>{profile.user_last_name}</TableCell>
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
