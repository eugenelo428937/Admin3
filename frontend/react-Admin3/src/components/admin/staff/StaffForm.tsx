import React from 'react';
import {
  TextField,
  Button,
  Container,
  Alert,
  Box,
  Typography,
  FormControl,
  FormLabel,
  Checkbox,
  FormControlLabel,
  CircularProgress,
} from '@mui/material';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.tsx';
import useStaffFormVM from './useStaffFormVM';

const AdminStaffForm: React.FC = () => {
  const { isSuperuser } = useAuth();
  const vm = useStaffFormVM();

  const {
    isEditMode,
    formData,
    loading,
    error,
    isSubmitting,
    handleChange,
    handleSubmit,
    handleCancel,
  } = vm;

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
            helperText={
              !formData.user && error !== null
                ? 'Please provide a user ID or email.'
                : ''
            }
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
          <Button variant="outlined" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default AdminStaffForm;
