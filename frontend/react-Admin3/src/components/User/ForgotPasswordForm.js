import React, { useState, useEffect } from "react";
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
   Link,
   useTheme,
} from "@mui/material";
import {
   EmailOutlined as EmailIcon,
   AccessTime as ClockIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import authService from "../../services/authService";

// For reCAPTCHA v2 checkbox alternative, you would import:
// import ReCAPTCHA from 'react-google-recaptcha';

const ForgotPasswordForm = () => {
   const theme = useTheme();
   const [email, setEmail] = useState("");
   const [isLoading, setIsLoading] = useState(false);
   const [message, setMessage] = useState("");
   const [error, setError] = useState("");
   const [isSubmitted, setIsSubmitted] = useState(false);
   const [expiryHours, setExpiryHours] = useState(24);
   const [countdown, setCountdown] = useState(10);
   const navigate = useNavigate();

   // Use reCAPTCHA v3 hook
   const { executeRecaptcha } = useGoogleReCaptcha();

   // Set to true to disable reCAPTCHA during development (to avoid signaling errors)
   const DISABLE_RECAPTCHA_IN_DEV =
      process.env.NODE_ENV === "development" &&
      process.env.REACT_APP_DISABLE_RECAPTCHA === "true";

   // Handle automatic redirect after email is sent
   useEffect(() => {
      let timer;
      if (isSubmitted && countdown > 0) {
         timer = setTimeout(() => {
            setCountdown(countdown - 1);
         }, 1000);
      } else if (isSubmitted && countdown === 0) {
         // Navigate to home and trigger login modal
         navigate("/home", { state: { showLogin: true } });
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
      setError("");
      setMessage("");

      // Validate email
      if (!email.trim()) {
         setError("Email is required");
         return;
      }

      if (!validateEmail(email)) {
         setError("Please enter a valid email address");
         return;
      }

      setIsLoading(true);

      try {
         let recaptchaToken = null;

         // Get reCAPTCHA v3 token if not disabled
         if (!DISABLE_RECAPTCHA_IN_DEV && executeRecaptcha) {
            try {
               recaptchaToken = await executeRecaptcha("password_reset");
            } catch (recaptchaError) {
               console.error("reCAPTCHA execution failed:", recaptchaError);
               setError("reCAPTCHA verification failed. Please try again.");
               setIsLoading(false);
               return;
            }
         }

         // Only require reCAPTCHA token in production or when not disabled
         if (!DISABLE_RECAPTCHA_IN_DEV && !recaptchaToken) {
            setError("reCAPTCHA verification is required");
            setIsLoading(false);
            return;
         }

         // Use authService which handles CORS and proper configuration
         const result = await authService.requestPasswordReset(email, recaptchaToken);

         if (result.status === "success") {
            setMessage(result.message);
            setExpiryHours(result.expiry_hours || 24);
            setIsSubmitted(true);
            setCountdown(10); // Reset countdown when email is successfully sent
         } else {
            setError(result.message || "Failed to send password reset email");
         }
      } catch (error) {
         console.error("Password reset error:", error);
         setError("An error occurred. Please try again later.");
      } finally {
         setIsLoading(false);
      }
   };

   const handleBackToLogin = () => {
      // Navigate to home and trigger login modal
      navigate("/home", { state: { showLogin: true } });
   };

   const handleResendEmail = () => {
      setIsSubmitted(false);
      setMessage("");
      setError("");
      setEmail("");
      setCountdown(10); // Reset countdown when resending
   };

   if (isSubmitted) {
      return (
         <Container sx={{ mt: 5 }}>
            <Grid container justifyContent="center">
               <Grid size={{ xs: 12, md: 6, lg: 5 }}>
                  <Card>
                     <CardHeader
                        title={
                           <Typography
                              variant="h4"
                              color={theme.palette.scales.granite[90]}
                           >
                              Check Your Email
                           </Typography>
                        }
                        sx={{
                           bgcolor: theme.palette.scales.granite[10],
                           textAlign: "center",
                        }}
                     />
                     <CardContent sx={{ textAlign: "center" }}>
                        <Box sx={{ mb: 4 }}>
                           <EmailIcon
                              sx={{ fontSize: "3rem", color: "success.main" }}
                           />
                        </Box>
                        <Alert
                           severity="success"
                           sx={{ textAlign: "left", mb: 3 }}
                        >
                           {message}
                        </Alert>
                        <Box sx={{ mb: 3 }}>
                           <Typography variant="body2" color="text.secondary">
                              The reset link will expire in{" "}
                              <strong>{expiryHours} minutes</strong>.
                           </Typography>
                        </Box>
                        <Box sx={{ mb: 3 }}>
                           <Alert
                              severity="info"
                              sx={{ display: "flex", alignItems: "center" }}
                           >
                              <ClockIcon sx={{ mr: 2 }} />
                              <span>
                                 Redirecting to login in{" "}
                                 <strong>{countdown}</strong> seconds...
                              </span>
                           </Alert>
                        </Box>
                        <Box sx={{ display: "grid", gap: 2 }}>
                           <Button
                              variant="contained"
                              onClick={handleBackToLogin}
                           >
                              Back to Login Now
                           </Button>
                           <Button
                              variant="outlined"
                              onClick={handleResendEmail}
                           >
                              Send Another Reset Email
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
                           variant="h4"
                           color={theme.palette.scales.granite[90]}
                           sx={{ mb: theme.spacingTokens.md }}
                        >
                           Reset Your Password
                        </Typography>
                     }
                     subheader={
                        <Typography
                           variant="body2"
                           color={theme.palette.scales.granite[80]}
                        >
                           Enter your email address and we'll send you a link to
                           reset your password if there is an account associated
                           with this email address.
                        </Typography>
                     }
                     sx={{
                        textAlign: "center",
                        bgcolor: theme.palette.scales.granite[10],
                        padding: theme.spacingTokens.lg,
                     }}
                  />
                  <CardContent>
                     {error && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                           {error}
                        </Alert>
                     )}

                     <Box component="form" onSubmit={handleSubmit}>
                        <FormControl fullWidth sx={{ mb: 3 }}>
                           <FormLabel>Email Address</FormLabel>
                           <TextField
                              type="email"
                              placeholder="Enter your email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              required
                              disabled={isLoading}
                              fullWidth
                           />
                        </FormControl>

                        {!DISABLE_RECAPTCHA_IN_DEV && (
                           <FormControl fullWidth sx={{ mb: 3 }}>
                              <Box sx={{ display: "flex", borderRadius: 1 }}>
                                 <Box
                                    sx={{
                                       display: "flex",
                                       alignItems: "center",
                                       border: 1,
                                       borderColor: "divider",
                                       borderRadius: 1,
                                       p: 3,
                                       bgcolor: "grey.100",
                                    }}
                                 >
                                    <img
                                       src="https://www.gstatic.com/recaptcha/api2/logo_48.png"
                                       alt="reCAPTCHA"
                                       width="24"
                                       height="24"
                                       style={{ marginRight: "8px" }}
                                    />
                                    <Box>
                                       <Typography
                                          variant="body2"
                                          color="text.secondary"
                                          sx={{ display: "block" }}
                                       >
                                          Protected by reCAPTCHA
                                       </Typography>
                                       <Box
                                          sx={{
                                             display: "flex",
                                             alignItems: "center",
                                          }}
                                       >
                                          <Link
                                             href="https://policies.google.com/privacy"
                                             target="_blank"
                                             rel="noopener noreferrer"
                                             sx={{ fontSize: "11px", mr: 2 }}
                                          >
                                             Privacy
                                          </Link>
                                          <Typography
                                             sx={{
                                                fontSize: "11px",
                                                color: "text.secondary",
                                                mr: 2,
                                             }}
                                          >
                                             -
                                          </Typography>
                                          <Link
                                             href="https://policies.google.com/terms"
                                             target="_blank"
                                             rel="noopener noreferrer"
                                             sx={{ fontSize: "11px" }}
                                          >
                                             Terms
                                          </Link>
                                       </Box>
                                    </Box>
                                 </Box>
                              </Box>
                           </FormControl>
                        )}

                        <Box sx={{ display: "grid", gap: 2 }}>
                           <Button
                              variant="contained"
                              type="submit"
                              disabled={isLoading}
                           >
                              {isLoading ? (
                                 <>
                                    <CircularProgress
                                       size={20}
                                       sx={{ mr: 2 }}
                                    />
                                    Sending Reset Email...
                                 </>
                              ) : (
                                 "Send Reset Email"
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

export default ForgotPasswordForm;
