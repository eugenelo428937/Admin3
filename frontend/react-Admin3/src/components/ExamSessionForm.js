// src/components/ExamSessionForm.js
import React, { useState, useEffect } from 'react';
import { Form, Button, Container, Alert } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import examSessionService from '../services/examSessionService';
import moment from 'moment';

const ExamSessionForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        session_code: '',
        start_date: '',
        end_date: ''
    });

    useEffect(() => {
        if (id) {
            fetchExamSession();
        }
    }, [id]);

    const fetchExamSession = async () => {
        try {
            const data = await examSessionService.getById(id);
            setFormData({
                session_code: data.session_code,
                start_date: moment(data.start_date).format('YYYY-MM-DDTHH:mm'),
                end_date: moment(data.end_date).format('YYYY-MM-DDTHH:mm')
            });
        } catch (err) {
            setError('Failed to fetch exam session');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (id) {
                await examSessionService.update(id, formData);
            } else {
                await examSessionService.create(formData);
            }
            navigate('/exam-sessions');
        } catch (err) {
            setError('Failed to save exam session');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <Container>
            <h2 className="my-4">{id ? 'Edit' : 'Create'} Exam Session</h2>
            
            {error && <Alert variant="danger">{error}</Alert>}

            <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                    <Form.Label>Session Code</Form.Label>
                    <Form.Control
                        type="text"
                        name="session_code"
                        value={formData.session_code}
                        onChange={handleChange}
                        required
                    />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>Start Date</Form.Label>
                    <Form.Control
                        type="datetime-local"
                        name="start_date"
                        value={formData.start_date}
                        onChange={handleChange}
                        required
                    />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>End Date</Form.Label>
                    <Form.Control
                        type="datetime-local"
                        name="end_date"
                        value={formData.end_date}
                        onChange={handleChange}
                        required
                    />
                </Form.Group>

                <Button variant="primary" type="submit">
                    {id ? 'Update' : 'Create'} Exam Session
                </Button>
                <Button 
                    variant="secondary" 
                    className="ms-2"
                    onClick={() => navigate('/exam-sessions')}
                >
                    Cancel
                </Button>
            </Form>
        </Container>
    );
};

export default ExamSessionForm;
