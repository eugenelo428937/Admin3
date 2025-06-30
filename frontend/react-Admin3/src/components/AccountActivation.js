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
    const [mode, setMode] = useState('activation'); // activation, email_verification
    const [newEmail, setNewEmail] = useState(null);

    useEffect(() => {
        const handleVerification = async () => {
            const uid = searchParams.get('uid');
            const token = searchParams.get('token');
            const email = searchParams.get('email'); // Only present for email verification

            if (!uid || !token) {
                setStatus('error');
                setMessage('Invalid verification link. Missing required parameters.');
                setIsLoading(false);
                return;
            }

            // Determine mode based on presence of email parameter
            const verificationMode = email ? 'email_verification' : 'activation';
            setMode(verificationMode);
            
            if (email) {
                setNewEmail(email);
            }

            try {
                setIsLoading(true);
                let response;

                if (verificationMode === 'email_verification') {
                    // Email verification mode
                    response = await authService.verifyEmailChange({
                        uid,
                        token,
                        new_email: email
                    });
                } else {
                    // Account activation mode
                    response = await authService.activateAccount(uid, token);
                }
                
                if (response.status === 'success') {
                    setStatus('success');
                    if (verificationMode === 'email_verification') {
                        setMessage(response.message || `Email address verified and updated to ${email} successfully!`);
                    } else {
                        setMessage(response.message || 'Account activated successfully! You can now log in.');
                    }
                } else {
                    setStatus('error');
                    setMessage(response.message || response.error || `${verificationMode === 'email_verification' ? 'Email verification' : 'Account activation'} failed.`);
                }
            } catch (error) {
                setStatus('error');
                setMessage(error.message || `${verificationMode === 'email_verification' ? 'Email verification' : 'Account activation'} failed. Please try again.`);
            } finally {
                setIsLoading(false);
            }
        };

        handleVerification();
    }, [searchParams]);

    const handleLoginRedirect = () => {
        navigate('/auth/login');
    };

    const handleProfileRedirect = () => {
        navigate('/profile');
    };

    const handleResendActivation = async () => {
        navigate('/auth/resend-activation');
    };

    const getTitle = () => {
        return mode === 'email_verification' ? 'Email Verification' : 'Account Activation';
    };

    const getSuccessIcon = () => {
        return mode === 'email_verification' ? 'fas fa-envelope-check' : 'fas fa-check-circle';
    };

    const getSuccessHeading = () => {
        return mode === 'email_verification' ? 'Email Verified Successfully!' : 'Account Activated Successfully!';
    };

    const getErrorHeading = () => {
        return mode === 'email_verification' ? 'Email Verification Failed' : 'Account Activation Failed';
    };

    const getLoadingMessage = () => {
        return mode === 'email_verification' ? 'Verifying your email address...' : 'Activating your account...';
    };

    return (
        <Container className="mt-5">
            <Row className="justify-content-center">
                <Col md={8} lg={6}>
                    <div className="text-center mb-4">
                        <h2>{getTitle()}</h2>
                    </div>

                    {isLoading && (
                        <div className="text-center">
                            <Spinner animation="border" role="status" className="mb-3">
                                <span className="visually-hidden">Loading...</span>
                            </Spinner>
                            <p>{getLoadingMessage()}</p>
                        </div>
                    )}

                    {!isLoading && status === 'success' && (
                        <Alert variant="success">
                            <Alert.Heading>
                                <i className={`${getSuccessIcon()} me-2`}></i>
                                {getSuccessHeading()}
                            </Alert.Heading>
                            <p className="mb-3">{message}</p>
                            
                            {mode === 'email_verification' && newEmail && (
                                <div className="bg-light p-3 rounded mb-3">
                                    <p className="mb-2 fw-bold">
                                        <i className="bi bi-info-circle me-2"></i>
                                        What's next:
                                    </p>
                                    <ul className="mb-0">
                                        <li>You can now use <strong>{newEmail}</strong> to log in</li>
                                        <li>All future communications will be sent to your new email</li>
                                        <li>Your profile has been updated with the new email address</li>
                                    </ul>
                                </div>
                            )}
                            
                            <div className="d-grid gap-2">
                                {mode === 'email_verification' ? (
                                    <>
                                        <Button 
                                            variant="primary" 
                                            size="lg"
                                            onClick={handleProfileRedirect}
                                        >
                                            <i className="fas fa-user me-2"></i>
                                            Back to Profile
                                        </Button>
                                        <Button 
                                            variant="outline-primary"
                                            onClick={handleLoginRedirect}
                                        >
                                            <i className="fas fa-sign-in-alt me-2"></i>
                                            Login with New Email
                                        </Button>
                                    </>
                                ) : (
                                    <Button 
                                        variant="primary" 
                                        size="lg"
                                        onClick={handleLoginRedirect}
                                    >
                                        <i className="fas fa-sign-in-alt me-2"></i>
                                        Go to Login
                                    </Button>
                                )}
                            </div>
                        </Alert>
                    )}

                    {!isLoading && status === 'error' && (
                        <Alert variant="danger">
                            <Alert.Heading>
                                <i className="fas fa-exclamation-triangle me-2"></i>
                                {getErrorHeading()}
                            </Alert.Heading>
                            <p className="mb-3">{message}</p>
                            
                            {mode === 'email_verification' && (
                                <div className="bg-light p-3 rounded mb-3">
                                    <p className="mb-2 fw-bold">
                                        <i className="bi bi-lightbulb me-2"></i>
                                        Possible reasons:
                                    </p>
                                    <ul className="mb-0">
                                        <li>The verification link has expired (links are valid for 24 hours)</li>
                                        <li>The link has already been used</li>
                                        <li>The link was copied incorrectly</li>
                                        <li>The email address is already in use by another account</li>
                                    </ul>
                                </div>
                            )}
                            
                            <div className="d-grid gap-2">
                                {mode === 'email_verification' ? (
                                    <>
                                        <Button 
                                            variant="primary"
                                            onClick={handleProfileRedirect}
                                        >
                                            <i className="fas fa-user me-2"></i>
                                            Back to Profile
                                        </Button>
                                        <Button 
                                            variant="outline-danger"
                                            onClick={() => window.location.reload()}
                                        >
                                            <i className="fas fa-redo me-2"></i>
                                            Try Again
                                        </Button>
                                    </>
                                ) : (
                                    <>
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
                                    </>
                                )}
                            </div>
                        </Alert>
                    )}
                </Col>
            </Row>
        </Container>
    );
};

export default AccountActivation; 