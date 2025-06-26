import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, Row, Col, Alert, Spinner, Button } from "react-bootstrap";
import authService from "../services/authService";
import logger from "../services/loggerService";

const EmailVerification = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [verificationStatus, setVerificationStatus] = useState(null);
    const [error, setError] = useState(null);
    const [newEmail, setNewEmail] = useState(null);

    useEffect(() => {
        const verifyEmail = async () => {
            try {
                const uid = searchParams.get('uid');
                const token = searchParams.get('token');
                const email = searchParams.get('email');

                if (!uid || !token || !email) {
                    setError("Invalid verification link. Please check the link from your email.");
                    return;
                }

                setNewEmail(email);
                logger.debug("Verifying email change", { uid, email });

                // Call the email verification endpoint
                const result = await authService.verifyEmailChange({
                    uid,
                    token,
                    new_email: email
                });

                if (result.status === "success") {
                    setVerificationStatus("success");
                    logger.info("Email verification successful", { email });
                } else {
                    setError(result.message || "Email verification failed");
                    logger.error("Email verification failed", { error: result.message });
                }
            } catch (err) {
                setError("An error occurred during email verification. Please try again.");
                logger.error("Email verification error", { error: err });
            } finally {
                setLoading(false);
            }
        };

        verifyEmail();
    }, [searchParams]);

    const handleBackToProfile = () => {
        navigate("/profile");
    };

    const handleBackToLogin = () => {
        navigate("/");
    };

    if (loading) {
        return (
            <Row className="justify-content-center">
                <Col md={6} lg={4}>
                    <Card>
                        <Card.Body className="text-center py-5">
                            <Spinner animation="border" variant="primary" className="mb-3" />
                            <h5>Verifying Email</h5>
                            <p className="text-muted">Please wait while we verify your new email address...</p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        );
    }

    return (
        <Row className="justify-content-center">
            <Col md={8} lg={6}>
                <Card>
                    <Card.Header className={`text-white ${verificationStatus === 'success' ? 'bg-success' : 'bg-danger'}`}>
                        <h4 className="mb-0">
                            <i className={`bi ${verificationStatus === 'success' ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-2`}></i>
                            Email Verification
                        </h4>
                    </Card.Header>
                    <Card.Body>
                        {verificationStatus === "success" && (
                            <Alert variant="success">
                                <Alert.Heading>
                                    <i className="bi bi-check-circle-fill me-2"></i>
                                    Email Verified Successfully!
                                </Alert.Heading>
                                <p className="mb-3">
                                    Your email address has been changed to <strong>{newEmail}</strong> and verified successfully.
                                </p>
                                <div className="bg-light p-3 rounded mb-3">
                                    <p className="mb-2 fw-bold">
                                        <i className="bi bi-info-circle me-2"></i>
                                        What's next:
                                    </p>
                                    <ul className="mb-0">
                                        <li>You can now use your new email address to log in</li>
                                        <li>All future communications will be sent to your new email</li>
                                        <li>Your profile has been updated with the new email address</li>
                                    </ul>
                                </div>
                                <div className="d-flex gap-2 flex-wrap">
                                    <Button variant="primary" onClick={handleBackToProfile}>
                                        <i className="bi bi-person-circle me-1"></i>
                                        Back to Profile
                                    </Button>
                                    <Button variant="outline-primary" onClick={handleBackToLogin}>
                                        <i className="bi bi-box-arrow-in-right me-1"></i>
                                        Login with New Email
                                    </Button>
                                </div>
                            </Alert>
                        )}

                        {error && (
                            <Alert variant="danger">
                                <Alert.Heading>
                                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                    Verification Failed
                                </Alert.Heading>
                                <p className="mb-3">{error}</p>
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
                                <div className="d-flex gap-2 flex-wrap">
                                    <Button variant="primary" onClick={handleBackToProfile}>
                                        <i className="bi bi-person-circle me-1"></i>
                                        Back to Profile
                                    </Button>
                                    <Button variant="outline-danger" onClick={() => window.location.reload()}>
                                        <i className="bi bi-arrow-clockwise me-1"></i>
                                        Try Again
                                    </Button>
                                </div>
                            </Alert>
                        )}
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    );
};

export default EmailVerification; 