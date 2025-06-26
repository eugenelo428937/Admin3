import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const ResetPasswordForm = () => {
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract uid and token from URL parameters
  const urlParams = new URLSearchParams(location.search);
  const uid = urlParams.get('uid');
  const token = urlParams.get('token');

  useEffect(() => {
    // Check if we have the required parameters
    if (!uid || !token) {
      setError('Invalid reset link. Please request a new password reset.');
      setTokenValid(false);
    } else {
      setTokenValid(true);
    }
  }, [uid, token]);

  const validatePassword = (password) => {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!/(?=.*\d)/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    return { valid: true, message: 'Strong password' };
  };

  const getPasswordStrength = (password) => {
    if (password.length === 0) return '';
    
    let score = 0;
    if (password.length >= 8) score++;
    if (/(?=.*[a-z])/.test(password)) score++;
    if (/(?=.*[A-Z])/.test(password)) score++;
    if (/(?=.*\d)/.test(password)) score++;
    if (/(?=.*[!@#$%^&*])/.test(password)) score++;

    if (score < 2) return 'Weak';
    if (score < 4) return 'Medium';
    return 'Strong';
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'newPassword') {
      setPasswordStrength(getPasswordStrength(value));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords
    if (!passwords.newPassword.trim()) {
      setError('New password is required');
      return;
    }

    const passwordValidation = validatePassword(passwords.newPassword);
    if (!passwordValidation.valid) {
      setError(passwordValidation.message);
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post('http://127.0.0.1:8888/api/auth/password_reset_confirm/', {
        uid: uid,
        token: token,
        new_password: passwords.newPassword
      });

      if (response.data.success) {
        setSuccess(true);
      } else {
        setError(response.data.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Password reset confirm error:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('An error occurred. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    // Navigate to home and trigger login modal
    navigate('/home', { state: { showLogin: true } });
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 'Weak': return 'danger';
      case 'Medium': return 'warning';
      case 'Strong': return 'success';
      default: return 'secondary';
    }
  };

  // Show error if token is invalid
  if (tokenValid === false) {
    return (
      <Container className="mt-5">
        <Row className="justify-content-center">
          <Col md={6} lg={5}>
            <Card>
              <Card.Header className="bg-danger text-white text-center">
                <h4>Invalid Reset Link</h4>
              </Card.Header>
              <Card.Body className="text-center">
                <Alert variant="danger">
                  This password reset link is invalid or has expired. Please request a new password reset.
                </Alert>
                <div className="d-grid gap-2">
                  <Button variant="primary" onClick={() => navigate('/auth/forgot-password')}>
                    Request New Reset Link
                  </Button>
                  <Button variant="outline-secondary" onClick={handleBackToLogin}>
                    Back to Login
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  // Show success message
  if (success) {
    return (
      <Container className="mt-5">
        <Row className="justify-content-center">
          <Col md={6} lg={5}>
            <Card>
              <Card.Header className="bg-success text-white text-center">
                <h4>Password Reset Successful</h4>
              </Card.Header>
              <Card.Body className="text-center">
                <div className="mb-4">
                  <i className="bi bi-check-circle" style={{ fontSize: '3rem', color: '#28a745' }}></i>
                </div>
                <Alert variant="success">
                  Your password has been reset successfully. You can now login with your new password.
                </Alert>
                <div className="d-grid">
                  <Button variant="primary" onClick={handleBackToLogin}>
                    Go to Login
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
              <h4>Set New Password</h4>
              <small className="text-muted">
                Please enter your new password below.
              </small>
            </Card.Header>
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>New Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="newPassword"
                    placeholder="Enter new password"
                    value={passwords.newPassword}
                    onChange={handlePasswordChange}
                    required
                    disabled={isLoading}
                  />
                  {passwords.newPassword && (
                    <div className="mt-2">
                      <small className={`text-${getPasswordStrengthColor()}`}>
                        Password strength: {passwordStrength}
                      </small>
                    </div>
                  )}
                  <Form.Text className="text-muted">
                    Password must be at least 8 characters with uppercase, lowercase, and numbers.
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Confirm New Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="confirmPassword"
                    placeholder="Confirm new password"
                    value={passwords.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                    disabled={isLoading}
                  />
                  {passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword && (
                    <small className="text-danger">Passwords do not match</small>
                  )}
                </Form.Group>

                <div className="d-grid gap-2">
                  <Button 
                    variant="primary" 
                    type="submit" 
                    disabled={isLoading || passwords.newPassword !== passwords.confirmPassword}
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
                        Resetting Password...
                      </>
                    ) : (
                      'Reset Password'
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

export default ResetPasswordForm; 