import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Alert, Spinner, Button, Container, Row, Col } from 'react-bootstrap';
import authService from '../services/authService';

const AccountActivation = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('processing'); // processing, success, error
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const activateAccount = async () => {
            const uid = searchParams.get('uid');
            const token = searchParams.get('token');

            if (!uid || !token) {
                setStatus('error');
                setMessage('Invalid activation link. Missing required parameters.');
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                const response = await authService.activateAccount(uid, token);
                
                if (response.status === 'success') {
                    setStatus('success');
                    setMessage(response.message || 'Account activated successfully! You can now log in.');
                } else {
                    setStatus('error');
                    setMessage(response.message || response.error || 'Account activation failed.');
                }
            } catch (error) {
                setStatus('error');
                setMessage(error.message || 'Account activation failed. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        activateAccount();
    }, [searchParams]);

    const handleLoginRedirect = () => {
        navigate('/auth/login');
    };

    const handleResendActivation = async () => {
        // You could implement resend functionality here
        navigate('/auth/resend-activation');
    };

    return (
        <Container className="mt-5">
            <Row className="justify-content-center">
                <Col md={8} lg={6}>
                    <div className="text-center mb-4">
                        <h2>Account Activation</h2>
                    </div>

                    {isLoading && (
                        <div className="text-center">
                            <Spinner animation="border" role="status" className="mb-3">
                                <span className="visually-hidden">Loading...</span>
                            </Spinner>
                            <p>Activating your account...</p>
                        </div>
                    )}

                    {!isLoading && status === 'success' && (
                        <Alert variant="success">
                            <Alert.Heading>
                                <i className="fas fa-check-circle me-2"></i>
                                Account Activated Successfully!
                            </Alert.Heading>
                            <p className="mb-3">{message}</p>
                            <div className="d-grid gap-2">
                                <Button 
                                    variant="primary" 
                                    size="lg"
                                    onClick={handleLoginRedirect}
                                >
                                    <i className="fas fa-sign-in-alt me-2"></i>
                                    Go to Login
                                </Button>
                            </div>
                        </Alert>
                    )}

                    {!isLoading && status === 'error' && (
                        <Alert variant="danger">
                            <Alert.Heading>
                                <i className="fas fa-exclamation-triangle me-2"></i>
                                Activation Failed
                            </Alert.Heading>
                            <p className="mb-3">{message}</p>
                            <div className="d-grid gap-2">
                                <Button 
                                    variant="outline-primary"
                                    onClick={handleResendActivation}
                                >
                                    <i className="fas fa-envelope me-2"></i>
                                    Resend Activation Email
                                </Button>
                                <Button 
                                    variant="secondary"
                                    onClick={() => navigate('/')}
                                >
                                    <i className="fas fa-home me-2"></i>
                                    Go to Home
                                </Button>
                            </div>
                        </Alert>
                    )}
                </Col>
            </Row>
        </Container>
    );
};

export default AccountActivation; 