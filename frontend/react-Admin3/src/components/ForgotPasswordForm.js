import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import axios from 'axios';

// For reCAPTCHA v2 checkbox alternative, you would import:
// import ReCAPTCHA from 'react-google-recaptcha';

const ForgotPasswordForm = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [expiryHours, setExpiryHours] = useState(24);
  const [countdown, setCountdown] = useState(10);
  const navigate = useNavigate();

  // Use reCAPTCHA v3 hook
  const { executeRecaptcha } = useGoogleReCaptcha();
    
  // Set to true to disable reCAPTCHA during development (to avoid signaling errors)
  const DISABLE_RECAPTCHA_IN_DEV = process.env.NODE_ENV === 'development' && process.env.REACT_APP_DISABLE_RECAPTCHA === 'true';

  // Handle automatic redirect after email is sent
  useEffect(() => {
    let timer;
    if (isSubmitted && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (isSubmitted && countdown === 0) {
      // Navigate to home and trigger login modal
      navigate('/home', { state: { showLogin: true } });
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [isSubmitted, countdown, navigate]);

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

    setIsLoading(true);

    try {
      let recaptchaToken = null;

      // Get reCAPTCHA v3 token if not disabled
      if (!DISABLE_RECAPTCHA_IN_DEV && executeRecaptcha) {
        try {
          recaptchaToken = await executeRecaptcha('password_reset');
        } catch (recaptchaError) {
          console.error('reCAPTCHA execution failed:', recaptchaError);
          setError('reCAPTCHA verification failed. Please try again.');
          setIsLoading(false);
          return;
        }
      }

      // Only require reCAPTCHA token in production or when not disabled
      if (!DISABLE_RECAPTCHA_IN_DEV && !recaptchaToken) {
        setError('reCAPTCHA verification is required');
        setIsLoading(false);
        return;
      }

      const requestData = {
        email: email.trim()
      };

      // Add reCAPTCHA token if available
      if (recaptchaToken) {
        requestData.recaptcha_token = recaptchaToken;
      }

      const response = await axios.post('http://127.0.0.1:8888/api/auth/password_reset_request/', requestData);

      if (response.data.success) {
        setMessage(response.data.message);
        setExpiryHours(response.data.expiry_hours || 24);
        setIsSubmitted(true);
        setCountdown(10); // Reset countdown when email is successfully sent
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
    }
  };

  const handleBackToLogin = () => {
    // Navigate to home and trigger login modal
    navigate('/home', { state: { showLogin: true } });
  };

  const handleResendEmail = () => {
    setIsSubmitted(false);
    setMessage('');
    setError('');
    setEmail('');
    setCountdown(10); // Reset countdown when resending
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
                    The reset link will expire in <strong>{expiryHours} minutes</strong>.
                  </small>
                </div>
                <div className="mb-3">
                  <Alert variant="info" className="d-flex align-items-center">
                    <i className="bi bi-clock me-2"></i>
                    <span>Redirecting to login in <strong>{countdown}</strong> seconds...</span>
                  </Alert>
                </div>
                <div className="d-grid gap-2">
                  <Button variant="primary" onClick={handleBackToLogin}>
                    Back to Login Now
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
								Enter your email address and we'll send you a link to
								reset your password if there is an account associated
								with this email address.
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
								</Form.Group>

								{!DISABLE_RECAPTCHA_IN_DEV && (
									<Form.Group className="mb-3">
										<div className="d-flex rounded">
											<div className="d-flex align-items-center recaptcha-notice border rounded p-3 bg-light">
												<img
													src="https://www.gstatic.com/recaptcha/api2/logo_48.png"
													alt="reCAPTCHA"
													width="24"
													height="24"
													className="me-2"
												/>
												<div>
													<small className="text-muted d-block">
														Protected by reCAPTCHA
													</small>
													<div className="d-flex align-items-center">
														<a
															href="https://policies.google.com/privacy"
															target="_blank"
															rel="noopener noreferrer"
															className="text-decoration-none me-2"
															style={{ fontSize: "11px" }}>
															Privacy
														</a>
														<span
															style={{ fontSize: "11px" }}
															className="text-muted me-2">
															-
														</span>
														<a
															href="https://policies.google.com/terms"
															target="_blank"
															rel="noopener noreferrer"
															className="text-decoration-none"
															style={{ fontSize: "11px" }}>
															Terms
														</a>
													</div>
												</div>
											</div>
										</div>
									</Form.Group>
								)}

								<div className="d-grid gap-2">
									<Button
										variant="primary"
										type="submit"
										disabled={isLoading}>
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
											"Send Reset Email"
										)}
									</Button>

									<Button
										variant="outline-secondary"
										onClick={handleBackToLogin}
										disabled={isLoading}>
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