// src/components/admin/staff/StaffForm.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  TextField, Button, Container, Alert, Box, Typography,
  FormControl, FormLabel, Checkbox, FormControlLabel, CircularProgress
} from '@mui/material';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import staffService from '../../../services/staffService';

const AdminStaffForm = () => {
  const { isSuperuser } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    user: '',
    is_active: true,
  });

  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStaff = useCallback(async () => {
    try {
      const data = await staffService.getById(id);
      setFormData({
        user: data.user || '',
        is_active: data.is_active !== undefined ? data.is_active : true,
      });
    } catch (err) {
      setError('Failed to fetch staff details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isEditMode) {
      fetchStaff();
    }
  }, [isEditMode, fetchStaff]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.user) {
      setError('Please provide a user ID or email.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditMode) {
        await staffService.update(id, formData);
      } else {
        await staffService.create(formData);
      }
      navigate('/admin/staff');
    } catch (err) {
      setError(
        `Failed to ${isEditMode ? 'update' : 'create'} staff member. Please check your input and try again.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isSuperuser) return <Navigate to="/" replace />;
  if (loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
        {isEditMode ? 'Edit Staff Member' : 'Add New Staff Member'}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit}>
        <FormControl fullWidth sx={{ mb: 3 }}>
          <FormLabel>User (ID or Email)</FormLabel>
          <TextField
            required
            name="user"
            value={formData.user}
            onChange={handleChange}
            placeholder="Enter user ID or email address"
            fullWidth
            disabled={isSubmitting}
            error={!formData.user && error !== null}
            helperText={!formData.user && error !== null ? 'Please provide a user ID or email.' : ''}
          />
        </FormControl>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Checkbox
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            }
            label="Active"
          />
        </FormControl>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEditMode ? 'Update Staff Member' : 'Create Staff Member'}
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/admin/staff')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default AdminStaffForm;
