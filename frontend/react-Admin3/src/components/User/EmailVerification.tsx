import React from "react";
import {
  Card,
  CardHeader,
  CardContent,
  Grid,
  Alert,
  AlertTitle,
  CircularProgress,
  Button,
  Typography,
  Box,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Person as PersonIcon,
  Login as LoginIcon,
  Refresh as RefreshIcon,
  Lightbulb as LightbulbIcon,
} from "@mui/icons-material";
import useEmailVerificationVM from "./useEmailVerificationVM";

const EmailVerification: React.FC = () => {
  const vm = useEmailVerificationVM();

  if (vm.loading) {
    return (
      <Grid container justifyContent="center">
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Card>
            <CardContent sx={{ textAlign: "center", py: 5 }}>
              <CircularProgress color="primary" sx={{ mb: 3 }} />
              <Typography variant="h5">Verifying Email</Typography>
              <Typography color="text.secondary">
                Please wait while we verify your new email address...
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  }

  return (
    <Grid container justifyContent="center">
      <Grid size={{ xs: 12, md: 8, lg: 6 }}>
        <Card>
          <CardHeader
            title={
              <Box sx={{ display: "flex", alignItems: "center" }}>
                {vm.verificationStatus === "success" ? (
                  <CheckCircleIcon sx={{ mr: 2 }} />
                ) : (
                  <WarningIcon sx={{ mr: 2 }} />
                )}
                Email Verification
              </Box>
            }
            sx={{
              bgcolor:
                vm.verificationStatus === "success"
                  ? "success.main"
                  : "error.main",
              color: "white",
            }}
            titleTypographyProps={{ variant: "h4", sx: { mb: 0 } }}
          />
          <CardContent>
            {vm.verificationStatus === "success" && (
              <Alert severity="success">
                <AlertTitle
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <CheckCircleIcon sx={{ mr: 2 }} />
                  Email Verified Successfully!
                </AlertTitle>
                <Typography sx={{ mb: 3 }}>
                  Your email address has been changed to{" "}
                  <strong>{vm.newEmail}</strong> and verified
                  successfully.
                </Typography>
                <Box
                  sx={{
                    bgcolor: "grey.100",
                    p: 3,
                    borderRadius: 1,
                    mb: 3,
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
                    <InfoIcon sx={{ mr: 2 }} />
                    What's next:
                  </Typography>
                  <Box component="ul" sx={{ mb: 0 }}>
                    <li>
                      You can now use your new email address to log in
                    </li>
                    <li>
                      All future communications will be sent to your new
                      email
                    </li>
                    <li>
                      Your profile has been updated with the new email
                      address
                    </li>
                  </Box>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <Button
                    variant="contained"
                    onClick={vm.handleBackToProfile}
                    startIcon={<PersonIcon />}
                  >
                    Back to Profile
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={vm.handleBackToLogin}
                    startIcon={<LoginIcon />}
                  >
                    Login with New Email
                  </Button>
                </Box>
              </Alert>
            )}

            {vm.error && (
              <Alert severity="error">
                <AlertTitle
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <WarningIcon sx={{ mr: 2 }} />
                  Verification Failed
                </AlertTitle>
                <Typography sx={{ mb: 3 }}>{vm.error}</Typography>
                <Box
                  sx={{
                    bgcolor: "grey.100",
                    p: 3,
                    borderRadius: 1,
                    mb: 3,
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
                    <LightbulbIcon sx={{ mr: 2 }} />
                    Possible reasons:
                  </Typography>
                  <Box component="ul" sx={{ mb: 0 }}>
                    <li>
                      The verification link has expired (links are valid
                      for 24 hours)
                    </li>
                    <li>The link has already been used</li>
                    <li>The link was copied incorrectly</li>
                    <li>
                      The email address is already in use by another
                      account
                    </li>
                  </Box>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <Button
                    variant="contained"
                    onClick={vm.handleBackToProfile}
                    startIcon={<PersonIcon />}
                  >
                    Back to Profile
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={vm.handleReload}
                    startIcon={<RefreshIcon />}
                  >
                    Try Again
                  </Button>
                </Box>
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default EmailVerification;
