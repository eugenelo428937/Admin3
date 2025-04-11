// src/components/subjects/SubjectDetail.js
import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Alert } from 'react-bootstrap';
import { useParams, useNavigate, Link } from 'react-router-dom';
import subjectService from "../../../services/subjectService";
//asdasd
const SubjectDetail = () => {
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

  if (loading) return <div className="text-center mt-5">Loading...</div>;
  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!subject) return <Alert variant="warning">Subject not found.</Alert>;

  return (
    <Container className="mt-4">
      <Card>
        <Card.Header as="h4">{subject.code}</Card.Header>
        <Card.Body>
          <Card.Text>
            <strong>Description:</strong> {subject.description || 'No description available.'}
          </Card.Text>          
          <Card.Text>
            <strong>Status:</strong> {subject.active ? 'Active' : 'Inactive'}
          </Card.Text>
          <Card.Text>
            <strong>Created:</strong> {new Date(subject.created_at).toLocaleString()}
          </Card.Text>
          <Card.Text>
            <strong>Last Updated:</strong> {new Date(subject.updated_at).toLocaleString()}
          </Card.Text>
        </Card.Body>
        <Card.Footer className="d-flex justify-content-between">
          <div>
            <Link to={`/subjects/${id}/edit`} className="btn btn-primary me-2">
              Edit
            </Link>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
          <Button variant="secondary" onClick={() => navigate('/subjects')}>
            Back to Subjects
          </Button>
        </Card.Footer>
      </Card>
    </Container>
  );
};

export default SubjectDetail;
