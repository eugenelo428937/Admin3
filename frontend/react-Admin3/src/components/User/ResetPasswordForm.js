import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardHeader,
  CardContent,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Box,
  Typography,
  FormControl,
  FormLabel,
  FormHelperText,
  useTheme
} from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../services/authService';

const ResetPasswordForm = () => {
  const theme = useTheme();
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
      // Use authService which handles CORS and proper configuration
      const result = await authService.confirmPasswordReset(uid, token, passwords.newPassword);

      if (result.status === 'success') {
        setSuccess(true);
      } else {
        setError(result.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Password reset confirm error:', error);
      setError('An error occurred. Please try again later.');
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
      case 'Weak': return 'error';
      case 'Medium': return 'warning';
      case 'Strong': return 'success';
      default: return 'text.secondary';
    }
  };

  // Show error if token is invalid
  if (tokenValid === false) {
    return (
      <Container sx={{ mt: 5 }}>
        <Grid container justifyContent="center">
          <Grid size={{ xs: 12, md: 6, lg: 5 }}>
            <Card>
              <CardHeader
                title={
                  <Typography 
                    variant='h4' 
                    color={theme.palette.bpp.granite["090"]}>
                    Invalid Reset Link
                  </Typography>
                  }
                sx={{ bgcolor: 'error.main', color: 'white', textAlign: 'center' }}                
              />
              <CardContent sx={{ textAlign: 'center' }}>
                <Alert severity="error" sx={{ mb: 3 }}>
                  This password reset link is invalid or has expired. Please request a new password reset.
                </Alert>
                <Box sx={{ display: 'grid', gap: 2 }}>
                  <Button variant="contained" onClick={() => navigate('/auth/forgot-password')}>
                    Request New Reset Link
                  </Button>
                  <Button variant="outlined" onClick={handleBackToLogin}>
                    Back to Login
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    );
  }

  // Show success message
  if (success) {
    return (
      <Container sx={{ mt: 5 }}>
        <Grid container justifyContent="center">
          <Grid size={{ xs: 12, md: 6, lg: 5 }}>
            <Card>
              <CardHeader
                title={
                <Typography 
                  variant='h4' 
                  color={theme.palette.bpp.granite["090"]}>
                  Password Reset Successful
                </Typography>
                }
                sx={{ bgcolor: theme.palette.bpp.granite["030"], color: 'white', textAlign: 'center' }}
              />
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ mb: 4 }}>
                  <CheckCircleIcon sx={{ fontSize: '3rem', color: 'success.main' }} />
                </Box>
                <Alert severity="success" sx={{ mb: 3 }}>
                  Your password has been reset successfully. You can now login with your new password.
                </Alert>
                <Box sx={{ display: 'grid' }}>
                  <Button variant="contained" onClick={handleBackToLogin}>
                    Go to Login
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 5 }}>
      <Grid container justifyContent="center">
        <Grid size={{ xs: 12, md: 6, lg: 5 }}>
          <Card>
            <CardHeader
              title={
                <Typography 
                  variant='h4' 
                  color={theme.palette.bpp.granite["090"]}>
                  Set New Password
                </Typography>
                }              
              sx={{ bgcolor: theme.palette.bpp.granite["030"], textAlign: 'center' }}              
            />
            <CardContent>
              {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

              <Box component="form" onSubmit={handleSubmit}>
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <FormLabel>New Password</FormLabel>
                  <TextField
                    type="password"
                    name="newPassword"
                    placeholder="Enter new password"
                    value={passwords.newPassword}
                    onChange={handlePasswordChange}
                    required
                    disabled={isLoading}
                    fullWidth
                  />
                  {passwords.newPassword && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color={getPasswordStrengthColor()}>
                        Password strength: {passwordStrength}
                      </Typography>
                    </Box>
                  )}
                  <FormHelperText>
                    Password must be at least 8 characters with uppercase, lowercase, and numbers.
                  </FormHelperText>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                  <FormLabel>Confirm New Password</FormLabel>
                  <TextField
                    type="password"
                    name="confirmPassword"
                    placeholder="Confirm new password"
                    value={passwords.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                    disabled={isLoading}
                    fullWidth
                  />
                  {passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword && (
                    <FormHelperText error>Passwords do not match</FormHelperText>
                  )}
                </FormControl>

                <Box sx={{ display: 'grid', gap: 2 }}>
                  <Button
                    variant="contained"
                    type="submit"
                    disabled={isLoading || passwords.newPassword !== passwords.confirmPassword}
                  >
                    {isLoading ? (
                      <>
                        <CircularProgress
                          size={20}
                          sx={{ mr: 2 }}
                        />
                        Resetting Password...
                      </>
                    ) : (
                      'Reset Password'
                    )}
                  </Button>

                  <Button
                    variant="outlined"
                    onClick={handleBackToLogin}
                    disabled={isLoading}
                  >
                    Back to Login
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ResetPasswordForm; 