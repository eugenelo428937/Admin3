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
  FormHelperText,
  useTheme,
} from "@mui/material";
import { CheckCircle as CheckCircleIcon } from "@mui/icons-material";
import useResetPasswordVM from "./useResetPasswordVM";

const ResetPasswordForm: React.FC = () => {
  const theme = useTheme();
  const vm = useResetPasswordVM();

  // Show error if token is invalid
  if (vm.tokenValid === false) {
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
                    Invalid Reset Link
                  </Typography>
                }
                sx={{
                  bgcolor: "error.main",
                  color: "white",
                  textAlign: "center",
                }}
              />
              <CardContent sx={{ textAlign: "center" }}>
                <Alert severity="error" sx={{ mb: 3 }}>
                  This password reset link is invalid or has expired. Please
                  request a new password reset.
                </Alert>
                <Box sx={{ display: "grid", gap: 2 }}>
                  <Button
                    variant="contained"
                    onClick={vm.navigateToForgotPassword}
                  >
                    Request New Reset Link
                  </Button>
                  <Button variant="outlined" onClick={vm.handleBackToLogin}>
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
  if (vm.success) {
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
                    Password Reset Successful
                  </Typography>
                }
                sx={{
                  bgcolor: (theme.palette as any).scales.granite[30],
                  color: "white",
                  textAlign: "center",
                }}
              />
              <CardContent sx={{ textAlign: "center" }}>
                <Box sx={{ mb: 4 }}>
                  <CheckCircleIcon
                    sx={{ fontSize: "3rem", color: "success.main" }}
                  />
                </Box>
                <Alert severity="success" sx={{ mb: 3 }}>
                  Your password has been reset successfully. You can now login
                  with your new password.
                </Alert>
                <Box sx={{ display: "grid" }}>
                  <Button variant="contained" onClick={vm.handleBackToLogin}>
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
                  variant="h4"
                  color={(theme.palette as any).scales.granite[90]}
                >
                  Set New Password
                </Typography>
              }
              sx={{
                bgcolor: (theme.palette as any).scales.granite[30],
                textAlign: "center",
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
                  <FormLabel>New Password</FormLabel>
                  <TextField
                    type="password"
                    name="newPassword"
                    placeholder="Enter new password"
                    value={vm.passwords.newPassword}
                    onChange={vm.handlePasswordChange}
                    required
                    disabled={vm.isLoading}
                    fullWidth
                  />
                  {vm.passwords.newPassword && (
                    <Box sx={{ mt: 2 }}>
                      <Typography
                        variant="body2"
                        color={vm.getPasswordStrengthColor()}
                      >
                        Password strength: {vm.passwordStrength}
                      </Typography>
                    </Box>
                  )}
                  <FormHelperText>
                    Password must be at least 8 characters with uppercase,
                    lowercase, and numbers.
                  </FormHelperText>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                  <FormLabel>Confirm New Password</FormLabel>
                  <TextField
                    type="password"
                    name="confirmPassword"
                    placeholder="Confirm new password"
                    value={vm.passwords.confirmPassword}
                    onChange={vm.handlePasswordChange}
                    required
                    disabled={vm.isLoading}
                    fullWidth
                  />
                  {vm.passwords.confirmPassword &&
                    vm.passwords.newPassword !==
                      vm.passwords.confirmPassword && (
                      <FormHelperText error>
                        Passwords do not match
                      </FormHelperText>
                    )}
                </FormControl>

                <Box sx={{ display: "grid", gap: 2 }}>
                  <Button
                    variant="contained"
                    type="submit"
                    disabled={
                      vm.isLoading ||
                      vm.passwords.newPassword !==
                        vm.passwords.confirmPassword
                    }
                  >
                    {vm.isLoading ? (
                      <>
                        <CircularProgress size={20} sx={{ mr: 2 }} />
                        Resetting Password...
                      </>
                    ) : (
                      "Reset Password"
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

export default ResetPasswordForm;
