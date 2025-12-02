import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  AlertTitle,
  CircularProgress,
  Button,
  Container,
  Grid,
  Box,
  Typography
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
  Login as LoginIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon,
  Info as InfoIcon,
  Lightbulb as LightbulbIcon
} from '@mui/icons-material';
import authService from '../../services/authService';

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

    // Redirect to products page after successful account activation (with delay)
    useEffect(() => {
        if (status === 'success' && mode === 'activation' && !isLoading) {
            // Show success message for 10 seconds before redirecting
            const timer = setTimeout(() => {
                navigate('/products');
            }, 10000);

            return () => clearTimeout(timer);
        }
    }, [status, mode, isLoading, navigate]);

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
        return mode === 'email_verification' ? <EmailIcon sx={{ mr: 2 }} /> : <CheckCircleIcon sx={{ mr: 2 }} />;
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
        <Container sx={{ mt: 5 }}>
            <Grid container justifyContent="center">
                <Grid size={{ xs: 12, md: 8, lg: 6 }}>
                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                        <Typography variant="h4" component="h2">{getTitle()}</Typography>
                    </Box>

                    {isLoading && (
                        <Box sx={{ textAlign: 'center' }}>
                            <CircularProgress sx={{ mb: 3 }} />
                            <Typography>{getLoadingMessage()}</Typography>
                        </Box>
                    )}

                    {!isLoading && status === 'success' && (
                        <Alert severity="success">
                            <AlertTitle sx={{ display: 'flex', alignItems: 'center' }}>
                                {getSuccessIcon()}
                                {getSuccessHeading()}
                            </AlertTitle>
                            <Typography sx={{ mb: 3 }}>{message}</Typography>

                            {mode === 'email_verification' && newEmail && (
                                <Box sx={{ bgcolor: 'grey.100', p: 3, borderRadius: 1, mb: 3 }}>
                                    <Typography sx={{ mb: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                                        <InfoIcon sx={{ mr: 2 }} />
                                        What's next:
                                    </Typography>
                                    <Box component="ul" sx={{ mb: 0 }}>
                                        <li>You can now use <strong>{newEmail}</strong> to log in</li>
                                        <li>All future communications will be sent to your new email</li>
                                        <li>Your profile has been updated with the new email address</li>
                                    </Box>
                                </Box>
                            )}

                            <Box sx={{ display: 'grid', gap: 2 }}>
                                {mode === 'email_verification' ? (
                                    <>
                                        <Button
                                            variant="contained"
                                            size="large"
                                            onClick={handleProfileRedirect}
                                            startIcon={<PersonIcon />}
                                        >
                                            Back to Profile
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            onClick={handleLoginRedirect}
                                            startIcon={<LoginIcon />}
                                        >
                                            Login with New Email
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        variant="contained"
                                        size="large"
                                        onClick={handleLoginRedirect}
                                        startIcon={<LoginIcon />}
                                    >
                                        Go to Login
                                    </Button>
                                )}
                            </Box>
                        </Alert>
                    )}

                    {!isLoading && status === 'error' && (
                        <Alert severity="error">
                            <AlertTitle sx={{ display: 'flex', alignItems: 'center' }}>
                                <WarningIcon sx={{ mr: 2 }} />
                                {getErrorHeading()}
                            </AlertTitle>
                            <Typography sx={{ mb: 3 }}>{message}</Typography>

                            {mode === 'email_verification' && (
                                <Box sx={{ bgcolor: 'grey.100', p: 3, borderRadius: 1, mb: 3 }}>
                                    <Typography sx={{ mb: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                                        <LightbulbIcon sx={{ mr: 2 }} />
                                        Possible reasons:
                                    </Typography>
                                    <Box component="ul" sx={{ mb: 0 }}>
                                        <li>The verification link has expired (links are valid for 24 hours)</li>
                                        <li>The link has already been used</li>
                                        <li>The link was copied incorrectly</li>
                                        <li>The email address is already in use by another account</li>
                                    </Box>
                                </Box>
                            )}

                            <Box sx={{ display: 'grid', gap: 2 }}>
                                {mode === 'email_verification' ? (
                                    <>
                                        <Button
                                            variant="contained"
                                            onClick={handleProfileRedirect}
                                            startIcon={<PersonIcon />}
                                        >
                                            Back to Profile
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            onClick={() => window.location.reload()}
                                            startIcon={<RefreshIcon />}
                                        >
                                            Try Again
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            variant="outlined"
                                            onClick={handleResendActivation}
                                            startIcon={<EmailIcon />}
                                        >
                                            Resend Activation Email
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            onClick={() => navigate('/')}
                                            startIcon={<HomeIcon />}
                                        >
                                            Go to Home
                                        </Button>
                                    </>
                                )}
                            </Box>
                        </Alert>
                    )}
                </Grid>
            </Grid>
        </Container>
    );
};

export default AccountActivation; 