import React from 'react';
import {
  TextField, Button, Container, Alert, Box, Typography,
  FormControl, FormLabel, Checkbox, FormControlLabel, CircularProgress
} from '@mui/material';
import { Navigate } from 'react-router-dom';
import useSubjectFormVM from './useSubjectFormVM';

const AdminSubjectForm: React.FC = () => {
  const vm = useSubjectFormVM();

  if (!vm.isSuperuser) return <Navigate to="/" replace />;
  if (vm.loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
        {vm.isEditMode ? 'Edit Subject' : 'Add New Subject'}
      </Typography>

      {vm.error && <Alert severity="error" sx={{ mb: 3 }}>{vm.error}</Alert>}

      <Box component="form" onSubmit={vm.handleSubmit}>
        <FormControl fullWidth sx={{ mb: 3 }}>
          <FormLabel>Subject Code</FormLabel>
          <TextField
            required
            name="code"
            value={vm.formData.code}
            onChange={vm.handleChange}
            placeholder="Enter subject code (e.g. MATH101)"
            fullWidth
            error={!vm.formData.code && vm.error !== null}
            helperText={!vm.formData.code && vm.error !== null ? 'Please provide a subject code.' : ''}
          />
        </FormControl>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <FormLabel>Description</FormLabel>
          <TextField
            multiline
            rows={3}
            name="description"
            value={vm.formData.description || ''}
            onChange={vm.handleChange}
            placeholder="Enter subject description"
            fullWidth
          />
        </FormControl>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <FormControlLabel
            control={<Checkbox name="active" checked={vm.formData.active} onChange={vm.handleChange} />}
            label="Active"
          />
        </FormControl>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" type="submit">
            {vm.isEditMode ? 'Update Subject' : 'Create Subject'}
          </Button>
          <Button variant="outlined" onClick={vm.handleCancel}>
            Cancel
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default AdminSubjectForm;
