import React, { useState, useEffect } from "react";
import { Container, Alert, Card } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import RegistrationWizard from "../components/User/RegistrationWizard";

const Registration = () => {
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect authenticated users to dashboard
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const handleRegistrationSuccess = (result) => {
    setError("");
    setSuccess(true);
    setSuccessMessage(
      result.message || 
      "Account created successfully! Please check your email for account activation instructions."
    );
  };

  const handleRegistrationError = (errorMessage) => {
    setSuccess(false);
    setSuccessMessage("");
    setError(errorMessage);
  };

  const handleSwitchToLogin = () => {
    navigate("/login");
  };

  const handleBackToLogin = () => {
    navigate("/login");
  };

  if (success) {
    return (
      <Container className="py-5">
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <Card className="shadow">
            <Card.Body className="text-center p-5">
              <div className="mb-4">
                <div className="success-icon mb-3" style={{ fontSize: '4rem', color: '#198754' }}>
                  ✅
                </div>
                <h2 className="text-success mb-3">Registration Successful!</h2>
                <p className="text-muted mb-4" style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
                  {successMessage}
                </p>
              </div>
              
              <div className="d-grid gap-2 col-md-6 mx-auto">
                <button 
                  className="btn btn-primary btn-lg"
                  onClick={handleBackToLogin}
                >
                  <i className="bi bi-box-arrow-in-right me-2"></i>
                  Go to Login
                </button>
              </div>
              
              <div className="mt-4">
                <Alert variant="info" className="text-start">
                  <Alert.Heading className="h6">
                    <i className="bi bi-info-circle me-2"></i>
                    What's Next?
                  </Alert.Heading>
                  <ul className="mb-0" style={{ fontSize: '0.9rem' }}>
                    <li>Check your email inbox (and spam folder) for the activation link</li>
                    <li>Click the activation link to verify your email address</li>
                    <li>Once activated, you can log in to access your account</li>
                    <li>Complete your profile and start exploring our courses</li>
                  </ul>
                </Alert>
              </div>
            </Card.Body>
          </Card>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <div className="text-center mb-4">
        <h1 className="display-5 fw-bold text-primary mb-2">
          Join Our Community
        </h1>
        <p className="lead text-muted">
          Start your actuarial education journey with thousands of professionals
        </p>
      </div>

      {error && (
        <div style={{ maxWidth: '700px', margin: '0 auto 2rem' }}>
          <Alert variant="danger" dismissible onClose={() => setError("")}>
            <Alert.Heading>
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Registration Failed
            </Alert.Heading>
            <p className="mb-0">{error}</p>
          </Alert>
        </div>
      )}

      <RegistrationWizard
        onSuccess={handleRegistrationSuccess}
        onError={handleRegistrationError}
        onSwitchToLogin={handleSwitchToLogin}
      />

      <div className="text-center mt-5">
        <div className="text-muted" style={{ fontSize: '0.9rem' }}>
          <p>
            By creating an account, you agree to our{" "}
            <a href="/terms" className="text-decoration-none">Terms of Service</a> and{" "}
            <a href="/privacy" className="text-decoration-none">Privacy Policy</a>
          </p>
        </div>
      </div>
    </Container>
  );
};

export default Registration;