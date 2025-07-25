import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Alert, Container, Row, Col, Spinner } from 'react-bootstrap';
import authService from '../../services/authService';

const ResendActivation = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState(null); // 'success', 'error', or null
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!email.trim()) {
            setStatus('error');
            setMessage('Please enter your email address.');
            return;
        }

        if (!/^\S+@\S+\.\S+$/.test(email)) {
            setStatus('error');
            setMessage('Please enter a valid email address.');
            return;
        }

        setIsLoading(true);
        setStatus(null);
        setMessage('');

        try {
            const response = await authService.resendActivationEmail(email);
            
            if (response.status === 'success') {
                setStatus('success');
                setMessage(response.message || 'Activation email sent successfully! Please check your inbox.');
            } else {
                setStatus('error');
                setMessage(response.message || 'Failed to send activation email.');
            }
        } catch (error) {
            setStatus('error');
            setMessage(error.message || 'Failed to send activation email. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackToLogin = () => {
        navigate('/auth/login');
    };

    return (
        <Container className="mt-5">
            <Row className="justify-content-center">
                <Col md={6} lg={4}>
                    <div className="text-center mb-4">
                        <h2>Resend Activation Email</h2>
                        <p className="text-muted">
                            Enter your email address to receive a new activation link.
                        </p>
                    </div>

                    {status === 'success' && (
                        <Alert variant="success" className="mb-4">                            
                            <p className="mb-3">{message}</p>
                            <div className="bg-light p-3 rounded">
                                <p className="mb-2 fw-bold">
                                    <i className="fas fa-envelope me-2"></i>
                                    Next steps:
                                </p>
                                <p>Check your email inbox (and spam folder) and click the activation link in the email</p>
                            </div>
                            <hr />
                            <div className="d-grid">
                                <Button variant="outline-primary" onClick={handleBackToLogin}>
                                    <i className="fas fa-sign-in-alt me-2"></i>
                                    Back to Login
                                </Button>
                            </div>
                        </Alert>
                    )}

                    {status === 'error' && (
                        <Alert variant="danger" className="mb-4">
                            <Alert.Heading>
                                <i className="fas fa-exclamation-triangle me-2"></i>
                                Error
                            </Alert.Heading>
                            <p>{message}</p>
                        </Alert>
                    )}

                    {status !== 'success' && (
                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3">
                                <Form.Label>Email Address</Form.Label>
                                <Form.Control
                                    type="email"
                                    placeholder="Enter your email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </Form.Group>

                            <div className="d-grid gap-2">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={isLoading}
                                    size="lg"
                                >
                                    {isLoading ? (
                                        <>
                                            <Spinner
                                                as="span"
                                                animation="border"
                                                size="sm"
                                                role="status"
                                                aria-hidden="true"
                                                className="me-2"
                                            />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-envelope me-2"></i>
                                            Send Activation Email
                                        </>
                                    )}
                                </Button>
                                
                                <Button
                                    variant="outline-secondary"
                                    onClick={handleBackToLogin}
                                    disabled={isLoading}
                                >
                                    <i className="fas fa-arrow-left me-2"></i>
                                    Back to Login
                                </Button>
                            </div>
                        </Form>
                    )}
                </Col>
            </Row>
        </Container>
    );
};

export default ResendActivation; 