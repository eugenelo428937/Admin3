import React, { useState, useEffect } from "react";
import { Container, Form, Button, Alert, Card, Row, Col } from "react-bootstrap";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import authService from "../services/authService";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect authenticated users to home
    if (isAuthenticated) {
      navigate("/home");
    }
  }, [isAuthenticated, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await authService.login(formData.email, formData.password);
      
      if (result.status === "success") {
        login(result.data);
        navigate("/home");
      } else {
        setError(result.message || "Login failed");
      }
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={6} lg={5}>
          <div className="text-center mb-4">
            <h1 className="display-5 fw-bold text-primary mb-2">
              Welcome Back
            </h1>
            <p className="lead text-muted">
              Sign in to your ActEd account
            </p>
          </div>

          <Card className="shadow">
            <Card.Body className="p-4">
              {error && (
                <Alert variant="danger" className="mb-4">
                  <Alert.Heading className="h6">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    Login Failed
                  </Alert.Heading>
                  <p className="mb-0">{error}</p>
                </Alert>
              )}

              <Form onSubmit={handleSubmit} noValidate>
                <Form.Group className="mb-3">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    required
                    disabled={isLoading}
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    required
                    disabled={isLoading}
                  />
                </Form.Group>

                <div className="d-grid mb-3">
                  <Button 
                    variant="primary" 
                    type="submit" 
                    disabled={isLoading}
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Signing In...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-box-arrow-in-right me-2"></i>
                        Sign In
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-center">
                  <Link 
                    to="/auth/forgot-password" 
                    className="text-decoration-none"
                  >
                    <i className="bi bi-question-circle me-1"></i>
                    Forgot your password?
                  </Link>
                </div>
              </Form>
            </Card.Body>
          </Card>

          <div className="text-center mt-4">
            <p className="text-muted">
              Don't have an account?{" "}
              <Link to="/register2" className="text-decoration-none fw-bold">
                Create one here
              </Link>
            </p>
          </div>

          <div className="text-center mt-4">
            <div className="text-muted" style={{ fontSize: '0.9rem' }}>
              <p>
                Need help? <Link to="/contact" className="text-decoration-none">Contact Support</Link>
              </p>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;