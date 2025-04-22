// src/components/subjects/SubjectForm.js
import React, { useState, useEffect } from 'react';
import { Form, Button, Container, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import subjectService from "../../../services/subjectService";

const AdminSubjectForm = () => {
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
  const [validated, setValidated] = useState(false);

  useEffect(() => {
		const fetchSubject = async () => {
			try {
				const data = await subjectService.getById(id);
				setFormData(data);
				setLoading(false);
			} catch (err) {
				setError("Failed to fetch subject details. Please try again.");
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
    const form = e.currentTarget;
    
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    try {
      if (isEditMode) {
        await subjectService.update(id, formData);
      } else {
        await subjectService.create(formData);
      }
      navigate('/subjects');
    } catch (err) {
      setError(`Failed to ${isEditMode ? 'update' : 'create'} subject. Please check your input and try again.`);
    }
  };

  if (loading) return <div className="text-center mt-5">Loading...</div>;

  return (
    <Container className="mt-4">
      <h2>{isEditMode ? 'Edit Subject' : 'Add New Subject'}</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Form noValidate validated={validated} onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Subject Code</Form.Label>
          <Form.Control
            required
            type="text"
            name="code"
            value={formData.code}
            onChange={handleChange}
            placeholder="Enter subject code (e.g. MATH101)"
          />
          <Form.Control.Feedback type="invalid">
            Please provide a subject code.
          </Form.Control.Feedback>
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Label>Description</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            placeholder="Enter subject description"
          />
        </Form.Group>        

        <Form.Group className="mb-3">
          <Form.Check
            type="checkbox"
            name="active"
            label="Active"
            checked={formData.active}
            onChange={handleChange}
          />
        </Form.Group>

        <Button variant="primary" type="submit">
          {isEditMode ? 'Update Subject' : 'Create Subject'}
        </Button>
        <Button variant="secondary" className="ms-2" onClick={() => navigate('/subjects')}>
          Cancel
        </Button>
      </Form>
    </Container>
  );
};

export default AdminSubjectForm;
