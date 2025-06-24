import React, { useState, useRef } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import axios from 'axios';

const ForgotPasswordForm = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [expiryHours, setExpiryHours] = useState(24);
  const recaptchaRef = useRef(null);
  const navigate = useNavigate();

  // For development, you can set this to a test key
  // In production, you should use environment variables
  const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"; // Test key

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validate email
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Check reCAPTCHA
    const recaptchaValue = recaptchaRef.current?.getValue();
    if (!recaptchaValue) {
      setError('Please complete the reCAPTCHA verification');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:8888/api/auth/password_reset_request/', {
        email: email.trim(),
        recaptcha: recaptchaValue
      });

      if (response.data.success) {
        setMessage(response.data.message);
        setExpiryHours(response.data.expiry_hours || 24);
        setIsSubmitted(true);
      } else {
        setError(response.data.error || 'Failed to send password reset email');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('An error occurred. Please try again later.');
      }
    } finally {
      setIsLoading(false);
      // Reset reCAPTCHA
      recaptchaRef.current?.reset();
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  const handleResendEmail = () => {
    setIsSubmitted(false);
    setMessage('');
    setError('');
    setEmail('');
  };

  if (isSubmitted) {
    return (
      <Container className="mt-5">
        <Row className="justify-content-center">
          <Col md={6} lg={5}>
            <Card>
              <Card.Header className="bg-success text-white text-center">
                <h4>Check Your Email</h4>
              </Card.Header>
              <Card.Body className="text-center">
                <div className="mb-4">
                  <i className="bi bi-envelope-check" style={{ fontSize: '3rem', color: '#28a745' }}></i>
                </div>
                <Alert variant="success" className="text-left">
                  {message}
                </Alert>
                <div className="mb-3">
                  <small className="text-muted">
                    The reset link will expire in <strong>{expiryHours} hours</strong>.
                  </small>
                </div>
                <div className="d-grid gap-2">
                  <Button variant="primary" onClick={handleBackToLogin}>
                    Back to Login
                  </Button>
                  <Button variant="outline-secondary" onClick={handleResendEmail}>
                    Send Another Reset Email
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={6} lg={5}>
          <Card>
            <Card.Header className="text-center">
              <h4>Reset Your Password</h4>
              <small className="text-muted">
                Enter your email address and we'll send you a link to reset your password.
              </small>
            </Card.Header>
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <Form.Text className="text-muted">
                    We'll send reset instructions to this email address.
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={RECAPTCHA_SITE_KEY}
                    theme="light"
                  />
                </Form.Group>

                <div className="d-grid gap-2">
                  <Button 
                    variant="primary" 
                    type="submit" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          className="me-2"
                        />
                        Sending Reset Email...
                      </>
                    ) : (
                      'Send Reset Email'
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline-secondary" 
                    onClick={handleBackToLogin}
                    disabled={isLoading}
                  >
                    Back to Login
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ForgotPasswordForm; 