import React from "react";
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
import useForgotPasswordVM from "./useForgotPasswordVM";

const ForgotPasswordForm: React.FC = () => {
  const theme = useTheme();
  const vm = useForgotPasswordVM();

  if (vm.isSubmitted) {
    return (
      <Container sx={{ mt: 5 }}>
        <Grid container justifyContent="center">
          <Grid size={{ xs: 12, md: 6, lg: 5 }}>
            <Card>
              <CardHeader
                title={
                  <Typography
                    variant="h4"
                    color={(theme.palette as any).scales.granite[90]}
                  >
                    Check Your Email
                  </Typography>
                }
                sx={{
                  bgcolor: (theme.palette as any).scales.granite[10],
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
                  {vm.message}
                </Alert>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    The reset link will expire in{" "}
                    <strong>{vm.expiryHours} minutes</strong>.
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
                      <strong>{vm.countdown}</strong> seconds...
                    </span>
                  </Alert>
                </Box>
                <Box sx={{ display: "grid", gap: 2 }}>
                  <Button
                    variant="contained"
                    onClick={vm.handleBackToLogin}
                  >
                    Back to Login Now
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={vm.handleResendEmail}
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
                  color={(theme.palette as any).scales.granite[90]}
                  sx={{ mb: (theme as any).spacingTokens.md }}
                >
                  Reset Your Password
                </Typography>
              }
              subheader={
                <Typography
                  variant="body2"
                  color={(theme.palette as any).scales.granite[80]}
                >
                  Enter your email address and we'll send you a link to
                  reset your password if there is an account associated
                  with this email address.
                </Typography>
              }
              sx={{
                textAlign: "center",
                bgcolor: (theme.palette as any).scales.granite[10],
                padding: (theme as any).spacingTokens.lg,
              }}
            />
            <CardContent>
              {vm.error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {vm.error}
                </Alert>
              )}

              <Box component="form" onSubmit={vm.handleSubmit}>
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <FormLabel>Email Address</FormLabel>
                  <TextField
                    type="email"
                    placeholder="Enter your email"
                    value={vm.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      vm.setEmail(e.target.value)
                    }
                    required
                    disabled={vm.isLoading}
                    fullWidth
                  />
                </FormControl>

                {!vm.disableRecaptchaInDev && (
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
                    disabled={vm.isLoading}
                  >
                    {vm.isLoading ? (
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
                    onClick={vm.handleBackToLogin}
                    disabled={vm.isLoading}
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
