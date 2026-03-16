import React from "react";
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
  Divider,
} from "@mui/material";
import {
  Email as EmailIcon,
  Login as LoginIcon,
  ArrowBack as ArrowBackIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import useResendActivationVM from "./useResendActivationVM";

const ResendActivation: React.FC = () => {
  const vm = useResendActivationVM();

  return (
    <Container sx={{ mt: 5 }}>
      <Grid container justifyContent="center">
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Typography variant="h4" component="h2">
              Resend Activation Email
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Enter your email address to receive a new activation link.
            </Typography>
          </Box>

          {vm.status === "success" && (
            <Alert severity="success" sx={{ mb: 4 }}>
              <Typography sx={{ mb: 3 }}>{vm.message}</Typography>
              <Box
                sx={{
                  bgcolor: "grey.100",
                  p: 3,
                  borderRadius: 1,
                }}
              >
                <Typography
                  sx={{
                    mb: 2,
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <EmailIcon sx={{ mr: 2 }} />
                  Next steps:
                </Typography>
                <Typography>
                  Check your email inbox (and spam folder) and click the
                  activation link in the email
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: "grid" }}>
                <Button
                  variant="outlined"
                  onClick={vm.handleBackToLogin}
                  startIcon={<LoginIcon />}
                >
                  Back to Login
                </Button>
              </Box>
            </Alert>
          )}

          {vm.status === "error" && (
            <Alert severity="error" sx={{ mb: 4 }}>
              <AlertTitle
                sx={{ display: "flex", alignItems: "center" }}
              >
                <WarningIcon sx={{ mr: 2 }} />
                Error
              </AlertTitle>
              <Typography>{vm.message}</Typography>
            </Alert>
          )}

          {vm.status !== "success" && (
            <Box component="form" onSubmit={vm.handleSubmit}>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <FormLabel>Email Address</FormLabel>
                <TextField
                  type="email"
                  placeholder="Enter your email address"
                  value={vm.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    vm.setEmail(e.target.value)
                  }
                  required
                  disabled={vm.isLoading}
                  fullWidth
                />
              </FormControl>

              <Box sx={{ display: "grid", gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={vm.isLoading}
                  size="large"
                  startIcon={
                    vm.isLoading ? (
                      <CircularProgress size={20} />
                    ) : (
                      <EmailIcon />
                    )
                  }
                >
                  {vm.isLoading
                    ? "Sending..."
                    : "Send Activation Email"}
                </Button>

                <Button
                  variant="outlined"
                  onClick={vm.handleBackToLogin}
                  disabled={vm.isLoading}
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
