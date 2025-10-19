// src/components/subjects/SubjectDetail.js
import React, { useState, useEffect } from 'react';
import {
  Container,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Button,
  Alert,
  Box,
  Typography,
  CircularProgress
} from '@mui/material';
import { useParams, useNavigate, Link } from 'react-router-dom';
import subjectService from "../../../services/subjectService";

const AdminSubjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSubject = async () => {
			try {
				const data = await subjectService.getById(id);
				setSubject(data);
				setLoading(false);
			} catch (err) {
				setError("Failed to fetch subject details. Please try again.");
				setLoading(false);
			}
		};

    fetchSubject();
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this subject?')) {
      try {
        await subjectService.delete(id);
        navigate('/subjects');
      } catch (err) {
        setError('Failed to delete subject. Please try again later.');
      }
    }
  };

  if (loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>;
  if (!subject) return <Alert severity="warning" sx={{ mt: 4 }}>Subject not found.</Alert>;

  return (
    <Container sx={{ mt: 4 }}>
      <Card>
        <CardHeader
          title={subject.code}
          titleTypographyProps={{ variant: 'h4' }}
        />
        <CardContent>
          <Typography sx={{ mb: 2 }}>
            <strong>Description:</strong> {subject.description || 'No description available.'}
          </Typography>
          <Typography sx={{ mb: 2 }}>
            <strong>Status:</strong> {subject.active ? 'Active' : 'Inactive'}
          </Typography>
          <Typography sx={{ mb: 2 }}>
            <strong>Created:</strong> {new Date(subject.created_at).toLocaleString()}
          </Typography>
          <Typography sx={{ mb: 2 }}>
            <strong>Last Updated:</strong> {new Date(subject.updated_at).toLocaleString()}
          </Typography>
        </CardContent>
        <CardActions sx={{ display: 'flex', justifyContent: 'space-between', p: 2 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button component={Link} to={`/subjects/${id}/edit`} variant="contained">
              Edit
            </Button>
            <Button variant="contained" color="error" onClick={handleDelete}>
              Delete
            </Button>
          </Box>
          <Button variant="outlined" onClick={() => navigate('/subjects')}>
            Back to Subjects
          </Button>
        </CardActions>
      </Card>
    </Container>
  );
};

export default AdminSubjectDetail;
