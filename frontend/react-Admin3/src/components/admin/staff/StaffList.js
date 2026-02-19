// src/components/admin/staff/StaffList.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Alert, Paper, Typography, Box, CircularProgress, TablePagination
} from '@mui/material';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import staffService from '../../../services/staffService';

const AdminStaffList = () => {
  const { isSuperuser } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      const { results, count } = await staffService.list({
        page: page + 1,
        page_size: rowsPerPage,
      });
      setStaff(results);
      setTotalCount(count);
      setError(null);
    } catch (err) {
      console.error('Error fetching staff:', err);
      setError('Failed to fetch staff. Please try again later.');
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      try {
        await staffService.delete(id);
        fetchStaff();
      } catch (err) {
        setError('Failed to delete staff member. Please try again later.');
      }
    }
  };

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
        <Typography variant="h4" component="h2">Staff</Typography>
        <Button component={Link} to="/admin/staff/new" variant="contained">
          Add New Staff
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {staff.length === 0 && !error ? (
        <Alert severity="info">No staff members found.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>First Name</TableCell>
                <TableCell>Last Name</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {staff.map((member) => (
                <TableRow key={member.id} hover>
                  <TableCell>{member.id}</TableCell>
                  <TableCell>{member.user_detail?.email}</TableCell>
                  <TableCell>{member.user_detail?.first_name}</TableCell>
                  <TableCell>{member.user_detail?.last_name}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        component={Link}
                        to={`/admin/staff/${member.id}/edit`}
                        variant="contained"
                        color="warning"
                        size="small"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        onClick={() => handleDelete(member.id)}
                      >
                        Delete
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

export default AdminStaffList;
