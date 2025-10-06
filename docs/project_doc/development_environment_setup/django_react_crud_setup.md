# An Example for creating Django React CRUD Setup

## Abstract

1. Django Backend
    1. Create New Django App "Subject"
    1. Update/create files
    1. run migration and create table in DB
1. ReactJS Frontend
    1. Create subjectService.js
    1. Create component
    1. update navbar
    1. routes in App.js

## Steps

1. Django Backend
    1. First, create a new Django app called "subjects":

        ```bash
        python manage.py startapp subjects
        ```

    1. Add the app to INSTALLED_APPS in settings.py:

        ```python
        INSTALLED_APPS = [
            # ...
            'subjects',
            # ...
        ]
        ```

    1. Create the Subject model in subjects/models.py:

        ```python
            # subjects/models.py
            from django.db import models

            class Subject(models.Model):
                code = models.CharField(max_length=10, unique=True)
                name = models.CharField(max_length=100)
                description = models.TextField(blank=True, null=True)
                credits = models.PositiveIntegerField(default=3)
                active = models.BooleanField(default=True)
                created_at = models.DateTimeField(auto_now_add=True)
                updated_at = models.DateTimeField(auto_now=True)

                def __str__(self):
                    return f"{self.code}: {self.name}"
                
                class Meta:
                    ordering = ['code']
        ```

    1. Create a serializer in subjects/serializers.py:

        ```python
            # subjects/serializers.py
            from rest_framework import serializers
            from .models import Subject

            class SubjectSerializer(serializers.ModelSerializer):
                class Meta:
                    model = Subject
                    fields = '__all__'
        ```

    1. Create views in subjects/views.py:

        ```python
        # subjects/views.py
        from rest_framework import viewsets
        from rest_framework.permissions import IsAuthenticated
        from .models import Subject
        from .serializers import SubjectSerializer

        class SubjectViewSet(viewsets.ModelViewSet):
            queryset = Subject.objects.all()
            serializer_class = SubjectSerializer
            permission_classes = [IsAuthenticated]
        ```

    1. Create URL configuration in subjects/urls.py:

        ```python
        # subjects/urls.py
        from django.urls import path, include
        from rest_framework.routers import DefaultRouter
        from .views import SubjectViewSet

        router = DefaultRouter()
        router.register(r'subjects', SubjectViewSet)

        app_name = 'subjects'

        urlpatterns = [
            path('', include(router.urls)),
        ]
        ```

    1. Add to main URLs in main_project/urls.py:

        ```python
        # main_project/urls.py
        from django.urls import path, include

        urlpatterns = [
            # ... other URL patterns ...
            path('api/auth/', include('core_auth.urls')),
            path('students/', include('students.urls')),
            path('exam_sessions/', include('exam_sessions.urls')),
            path('subjects/', include('subjects.urls')),
        ]
        ```

    1. Run migrations:

    ```bash
        python manage.py makemigrations
        python manage.py migrate
    ```

1. React Frontend
    1. Create subjectService.js:

        ```tsx
            // src/services/subjectService.js
            import httpServiceProvider from "./httpService";
            const API_URL = process.env.REACT_APP_API_URL || "<http://127.0.0.1:8888/subjects>";

            const subjectService = {
                getAll: async () => {
                    const response = await httpServiceProvider.get(`${API_URL}/subjects/`);
                    return response.data;
                },

                getById: async (id) => {
                    const response = await httpServiceProvider.get(`${API_URL}/subjects/${id}/`);
                    return response.data;
                },

                create: async (subject) => {
                    const response = await httpServiceProvider.post(
                        `${API_URL}/subjects/`, 
                        subject
                    );
                    return response.data;
                },

                update: async (id, subject) => {
                    const response = await httpServiceProvider.put(
                        `${API_URL}/subjects/${id}/`, 
                        subject
                    );
                    return response.data;
                },

                delete: async (id) => {
                    await httpServiceProvider.delete(`${API_URL}/subjects/${id}/`);
                }
            };

            export default subjectService;
        ```

    1. Create SubjectList component:

        ```jsx
            // src/components/subjects/SubjectList.js
            import React, { useState, useEffect } from 'react';
            import { Container, Table, Button, Alert } from 'react-bootstrap';
            import { Link } from 'react-router-dom';
            import subjectService from '../../services/subjectService';

            const SubjectList = () => {
            const [subjects, setSubjects] = useState([]);
            const [loading, setLoading] = useState(true);
            const [error, setError] = useState(null);

            useEffect(() => {
                fetchSubjects();
            }, []);

            const fetchSubjects = async () => {
                try {
                const data = await subjectService.getAll();
                setSubjects(data);
                setLoading(false);
                } catch (err) {
                setError('Failed to fetch subjects. Please try again later.');
                setLoading(false);
                }
            };

            const handleDelete = async (id) => {
                if (window.confirm('Are you sure you want to delete this subject?')) {
                try {
                    await subjectService.delete(id);
                    setSubjects(subjects.filter(subject => subject.id !== id));
                } catch (err) {
                    setError('Failed to delete subject. Please try again later.');
                }
                }
            };

            if (loading) return <div className="text-center mt-5">Loading...</div>;

            return (
                <Container className="mt-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2>Subjects</h2>
                    <Link to="/subjects/new">
                    <Button variant="primary">Add New Subject</Button>
                    </Link>
                </div>

                {error && <Alert variant="danger">{error}</Alert>}

                {subjects.length === 0 ? (
                    <Alert variant="info">No subjects found.</Alert>
                ) : (
                    <Table striped bordered hover responsive>
                    <thead>
                        <tr>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Credits</th>
                        <th>Status</th>
                        <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {subjects.map((subject) => (
                        <tr key={subject.id}>
                            <td>{subject.code}</td>
                            <td>{subject.name}</td>
                            <td>{subject.credits}</td>
                            <td>{subject.active ? 'Active' : 'Inactive'}</td>
                            <td>
                            <Link to={`/subjects/${subject.id}`} className="btn btn-info btn-sm me-2">View</Link>
                            <Link to={`/subjects/${subject.id}/edit`} className="btn btn-warning btn-sm me-2">Edit</Link>
                            <Button variant="danger" size="sm" onClick={() => handleDelete(subject.id)}>Delete</Button>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </Table>
                )}
                </Container>
            );
            };

            export default SubjectList;
        ```

    1. Create SubjectForm component:
    
        ```jsx
            // src/components/subjects/SubjectForm.js
            import React, { useState, useEffect } from 'react';
            import { Form, Button, Container, Alert } from 'react-bootstrap';
            import { useParams, useNavigate } from 'react-router-dom';
            import subjectService from '../../services/subjectService';

            const SubjectForm = () => {
            const { id } = useParams();
            const navigate = useNavigate();
            const isEditMode = !!id;
            
            const [formData, setFormData] = useState({
                code: '',
                name: '',
                description: '',
                credits: 3,
                active: true
            });
            
            const [loading, setLoading] = useState(isEditMode);
            const [error, setError] = useState(null);
            const [validated, setValidated] = useState(false);

            useEffect(() => {
                if (isEditMode) {
                fetchSubject();
                }
            }, [id]);

            const fetchSubject = async () => {
                try {
                const data = await subjectService.getById(id);
                setFormData(data);
                setLoading(false);
                } catch (err) {
                setError('Failed to fetch subject details. Please try again.');
                setLoading(false);
                }
            };

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
                    <Form.Label>Subject Name</Form.Label>
                    <Form.Control
                        required
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter subject name"
                    />
                    <Form.Control.Feedback type="invalid">
                        Please provide a subject name.
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
                    <Form.Label>Credits</Form.Label>
                    <Form.Control
                        required
                        type="number"
                        name="credits"
                        min="0"
                        value={formData.credits}
                        onChange={handleChange}
                    />
                    <Form.Control.Feedback type="invalid">
                        Please provide a valid number of credits.
                    </Form.Control.Feedback>
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

            export default SubjectForm;
        ```

2.4 Create SubjectDetail component:
jsx

// src/components/subjects/SubjectDetail.js
import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Alert } from 'react-bootstrap';
import { useParams, useNavigate, Link } from 'react-router-dom';
import subjectService from '../../services/subjectService';

const SubjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSubject();
  }, [id]);

  const fetchSubject = async () => {
    try {
      const data = await subjectService.getById(id);
      setSubject(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch subject details. Please try again.');
      setLoading(false);
    }
  };

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
        <Card.Header as="h4">{subject.code}: {subject.name}</Card.Header>
        <Card.Body>
          <Card.Text>
            <strong>Description:</strong> {subject.description || 'No description available.'}
          </Card.Text>
          <Card.Text>
            <strong>Credits:</strong> {subject.credits}
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

2.5 Update the navigation menu to include Subjects:
jsx

// Assuming this is in your Navigation component
// ...

<NavDropdown title="Management" id="basic-nav-dropdown">
  <NavDropdown.Item as={NavLink} to="/students">
    Students
  </NavDropdown.Item>
  <NavDropdown.Item as={NavLink} to="/exam-sessions">
    Exam Sessions
  </NavDropdown.Item>
  <NavDropdown.Item as={NavLink} to="/subjects">
    Subjects
  </NavDropdown.Item>
  <NavDropdown.Divider />
  <NavDropdown.Item as={NavLink} to="/">
    Dashboard
  </NavDropdown.Item>
</NavDropdown>
2.6 Add the routes in App.js:
jsx

// In your App.js or routing configuration
import SubjectList from './components/subjects/SubjectList';
import SubjectForm from './components/subjects/SubjectForm';
import SubjectDetail from './components/subjects/SubjectDetail';

// ... within your Routes component:
<Route path="/subjects" element={<SubjectList />} />
<Route path="/subjects/new" element={<SubjectForm />} />
<Route path="/subjects/:id" element={<SubjectDetail />} />
<Route path="/subjects/:id/edit" element={<SubjectForm />} />
This implementation gives you a complete Subjects management system that follows the same patterns as your existing components. The components include:

A service for API communication
A list view to see all subjects
A form for creating/editing subjects
A detail view for viewing subject information
Navigation menu integration
All components use the centralized httpServiceProvider for API calls, ensuring consistent authentication and CSRF token handling.
