// src/components/admin/subjects/SubjectForm.js
import React, { useState, useEffect } from 'react';
import {
  TextField, Button, Container, Alert, Box, Typography,
  FormControl, FormLabel, Checkbox, FormControlLabel, CircularProgress
} from '@mui/material';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import subjectService from "../../../services/subjectService";

const AdminSubjectForm = () => {
  const { isSuperuser } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    code: '',
    description: '',
    active: true
  });

  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSubject = async () => {
      try {
        const data = await subjectService.getById(id);
        setFormData(data);
      } catch (err) {
        setError("Failed to fetch subject details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (isEditMode) {
      fetchSubject();
    }
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.code) {
      setError('Please provide a subject code.');
      return;
    }

    try {
      if (isEditMode) {
        await subjectService.update(id, formData);
      } else {
        await subjectService.create(formData);
      }
      navigate('/admin/subjects');
    } catch (err) {
      setError(`Failed to ${isEditMode ? 'update' : 'create'} subject. Please check your input and try again.`);
    }
  };

  if (!isSuperuser) return <Navigate to="/" replace />;
  if (loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
        {isEditMode ? 'Edit Subject' : 'Add New Subject'}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit}>
        <FormControl fullWidth sx={{ mb: 3 }}>
          <FormLabel>Subject Code</FormLabel>
          <TextField
            required
            name="code"
            value={formData.code}
            onChange={handleChange}
            placeholder="Enter subject code (e.g. MATH101)"
            fullWidth
            error={!formData.code && error !== null}
            helperText={!formData.code && error !== null ? 'Please provide a subject code.' : ''}
          />
        </FormControl>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <FormLabel>Description</FormLabel>
          <TextField
            multiline
            rows={3}
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            placeholder="Enter subject description"
            fullWidth
          />
        </FormControl>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <FormControlLabel
            control={<Checkbox name="active" checked={formData.active} onChange={handleChange} />}
            label="Active"
          />
        </FormControl>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" type="submit">
            {isEditMode ? 'Update Subject' : 'Create Subject'}
          </Button>
          <Button variant="outlined" onClick={() => navigate('/admin/subjects')}>
            Cancel
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default AdminSubjectForm;
