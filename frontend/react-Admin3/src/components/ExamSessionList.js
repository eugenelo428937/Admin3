// src/components/ExamSessionList.js
import React, { useState, useEffect } from 'react';
import { Table, Button, Container, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import examSessionService from '../services/examSessionService';
import moment from 'moment';

const ExamSessionList = () => {
    const [examSessions, setExamSessions] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchExamSessions();
    }, []);

    const fetchExamSessions = async () => {
        try {
            const data = await examSessionService.getAll();
            setExamSessions(data);
        } catch (err) {
            setError('Failed to fetch exam sessions');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this exam session?')) {
            try {
                await examSessionService.delete(id);
                setExamSessions(examSessions.filter(session => session.id !== id));
            } catch (err) {
                setError('Failed to delete exam session');
            }
        }
    };

    return (
        <Container>
            <h2 className="my-4">Exam Sessions</h2>
            <Link to="/exam-sessions/new" className="btn btn-primary mb-3">
                Create New Exam Session
            </Link>
            
            {error && <Alert variant="danger">{error}</Alert>}

            <Table striped bordered hover>
                <thead>
                    <tr>
                        <th>Session Code</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {examSessions.map(session => (
                        <tr key={session.id}>
                            <td>{session.session_code}</td>
                            <td>{moment(session.start_date).format('YYYY-MM-DD HH:mm')}</td>
                            <td>{moment(session.end_date).format('YYYY-MM-DD HH:mm')}</td>
                            <td>
                                <Link 
                                    to={`/exam-sessions/edit/${session.id}`} 
                                    className="btn btn-sm btn-info me-2"
                                >
                                    Edit
                                </Link>
                                <Button 
                                    variant="danger" 
                                    size="sm"
                                    onClick={() => handleDelete(session.id)}
                                >
                                    Delete
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </Container>
    );
};

export default ExamSessionList;
