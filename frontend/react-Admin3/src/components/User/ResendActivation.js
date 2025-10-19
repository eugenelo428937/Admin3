import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Box,
  Typography,
  FormControl,
  FormLabel,
  AlertTitle,
  Divider
} from '@mui/material';
import {
  Email as EmailIcon,
  Login as LoginIcon,
  ArrowBack as ArrowBackIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import authService from '../../services/authService';

const ResendActivation = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState(null); // 'success', 'error', or null
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!email.trim()) {
            setStatus('error');
            setMessage('Please enter your email address.');
            return;
        }

        if (!/^\S+@\S+\.\S+$/.test(email)) {
            setStatus('error');
            setMessage('Please enter a valid email address.');
            return;
        }

        setIsLoading(true);
        setStatus(null);
        setMessage('');

        try {
            const response = await authService.resendActivationEmail(email);
            
            if (response.status === 'success') {
                setStatus('success');
                setMessage(response.message || 'Activation email sent successfully! Please check your inbox.');
            } else {
                setStatus('error');
                setMessage(response.message || 'Failed to send activation email.');
            }
        } catch (error) {
            setStatus('error');
            setMessage(error.message || 'Failed to send activation email. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackToLogin = () => {
        navigate('/auth/login');
    };

    return (
        <Container sx={{ mt: 5 }}>
            <Grid container justifyContent="center">
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                        <Typography variant="h4" component="h2">
                            Resend Activation Email
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Enter your email address to receive a new activation link.
                        </Typography>
                    </Box>

                    {status === 'success' && (
                        <Alert severity="success" sx={{ mb: 4 }}>
                            <Typography sx={{ mb: 3 }}>{message}</Typography>
                            <Box sx={{ bgcolor: 'grey.100', p: 3, borderRadius: 1 }}>
                                <Typography sx={{ mb: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                                    <EmailIcon sx={{ mr: 2 }} />
                                    Next steps:
                                </Typography>
                                <Typography>
                                    Check your email inbox (and spam folder) and click the activation link in the email
                                </Typography>
                            </Box>
                            <Divider sx={{ my: 2 }} />
                            <Box sx={{ display: 'grid' }}>
                                <Button variant="outlined" onClick={handleBackToLogin} startIcon={<LoginIcon />}>
                                    Back to Login
                                </Button>
                            </Box>
                        </Alert>
                    )}

                    {status === 'error' && (
                        <Alert severity="error" sx={{ mb: 4 }}>
                            <AlertTitle sx={{ display: 'flex', alignItems: 'center' }}>
                                <WarningIcon sx={{ mr: 2 }} />
                                Error
                            </AlertTitle>
                            <Typography>{message}</Typography>
                        </Alert>
                    )}

                    {status !== 'success' && (
                        <Box component="form" onSubmit={handleSubmit}>
                            <FormControl fullWidth sx={{ mb: 3 }}>
                                <FormLabel>Email Address</FormLabel>
                                <TextField
                                    type="email"
                                    placeholder="Enter your email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    fullWidth
                                />
                            </FormControl>

                            <Box sx={{ display: 'grid', gap: 2 }}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={isLoading}
                                    size="large"
                                    startIcon={isLoading ? <CircularProgress size={20} /> : <EmailIcon />}
                                >
                                    {isLoading ? 'Sending...' : 'Send Activation Email'}
                                </Button>

                                <Button
                                    variant="outlined"
                                    onClick={handleBackToLogin}
                                    disabled={isLoading}
                                    startIcon={<ArrowBackIcon />}
                                >
                                    Back to Login
                                </Button>
                            </Box>
                        </Box>
                    )}
                </Grid>
            </Grid>
        </Container>
    );
};

export default ResendActivation; 