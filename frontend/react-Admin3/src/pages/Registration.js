import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import RegistrationWizard from "../components/User/RegistrationWizard";
import {
	Alert,
	Typography,
	Container,
	Paper,
	Card,
	CardContent,
	TextField,
	Button,
	Box,
} from "@mui/material";

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
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Card elevation={3}>
          <CardContent sx={{ textAlign: 'center', p: 5 }}>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h1" sx={{ fontSize: '4rem', color: '#198754', mb: 3 }}>
                ✅
              </Typography>
              <Typography variant="h4" color="success.main" sx={{ mb: 3 }}>
                Registration Successful!
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem', lineHeight: 1.6, mb: 4 }}>
                {successMessage}
              </Typography>
            </Box>
            
            <Box sx={{ maxWidth: 400, mx: 'auto', mb: 4 }}>
              <Button 
                variant="contained"
                size="large"
                fullWidth
                onClick={handleBackToLogin}
                sx={{ py: 1.5 }}
              >
                Go to Login
              </Button>
            </Box>
            
            <Alert severity="info" sx={{ textAlign: 'left', mt: 4 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                What's Next?
              </Typography>
              <Box component="ul" sx={{ mb: 0, fontSize: '0.9rem' }}>
                <li>Check your email inbox (and spam folder) for the activation link</li>
                <li>Click the activation link to verify your email address</li>
                <li>Once activated, you can log in to access your account</li>
                <li>Complete your profile and start exploring our courses</li>
              </Box>
            </Alert>
          </CardContent>
        </Card>        
      </Container>
    );
  }

  return (
		<Container maxWidth="lg" sx={{ py: 2 }}>
			{error && (
				<Box sx={{ maxWidth: 700, mx: 'auto', mb: 4 }}>
					<Alert
						severity="error"
						onClose={() => setError("")}
						sx={{ textAlign: 'left' }}
					>
						<Typography variant="h6" sx={{ mb: 1 }}>
							Registration Failed
						</Typography>
						<Typography variant="body2">{error}</Typography>
					</Alert>
				</Box>
			)}

			<RegistrationWizard
				onSuccess={handleRegistrationSuccess}
				onError={handleRegistrationError}
				onSwitchToLogin={handleSwitchToLogin}
			/>

			<Box sx={{ textAlign: 'center', mt: 2 }}>
				<Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.9rem" }}>
					By creating an account, you agree to our{" "}
					<Box component="a" href="/terms" sx={{ textDecoration: 'none', color: 'primary.main' }}>
						Terms of Service
					</Box>{" "}
					and{" "}
					<Box component="a" href="/privacy" sx={{ textDecoration: 'none', color: 'primary.main' }}>
						Privacy Policy
					</Box>
				</Typography>
			</Box>			
		</Container>
  );
};

export default Registration;