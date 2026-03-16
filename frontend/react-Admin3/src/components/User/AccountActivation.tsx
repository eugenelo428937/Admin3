import React from "react";
import {
  Alert,
  AlertTitle,
  CircularProgress,
  Button,
  Container,
  Grid,
  Box,
  Typography,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
  Login as LoginIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon,
  Info as InfoIcon,
  Lightbulb as LightbulbIcon,
  AddShoppingCart as AddShoppingCartIcon,
} from "@mui/icons-material";
import useAccountActivationVM from "./useAccountActivationVM";

const AccountActivation: React.FC = () => {
  const vm = useAccountActivationVM();

  return (
    <Container sx={{ mt: 5 }}>
      <Grid container justifyContent="center">
        <Grid size={{ xs: 12, md: 8, lg: 6 }}>
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Typography variant="h4" component="h2">
              {vm.title}
            </Typography>
          </Box>

          {vm.isLoading && (
            <Box sx={{ textAlign: "center" }}>
              <CircularProgress sx={{ mb: 3 }} />
              <Typography>{vm.loadingMessage}</Typography>
            </Box>
          )}

          {!vm.isLoading && vm.status === "success" && (
            <Alert severity="success">
              <AlertTitle
                sx={{ display: "flex", alignItems: "center" }}
              >
                {vm.successIcon === "email" ? (
                  <EmailIcon sx={{ mr: 2 }} />
                ) : (
                  <CheckCircleIcon sx={{ mr: 2 }} />
                )}
                {vm.successHeading}
              </AlertTitle>
              <Typography sx={{ mb: 3 }}>{vm.message}</Typography>

              {vm.mode === "email_verification" && vm.newEmail && (
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
                      You can now use <strong>{vm.newEmail}</strong> to
                      log in
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
              )}

              <Box sx={{ display: "grid", gap: 2 }}>
                {vm.mode === "email_verification" ? (
                  <>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={vm.handleProfileRedirect}
                      startIcon={<PersonIcon />}
                    >
                      Back to Profile
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={vm.handleLoginRedirect}
                      startIcon={<LoginIcon />}
                    >
                      Login with New Email
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="contained"
                    size="large"
                    onClick={vm.handleLoginRedirect}
                    startIcon={<AddShoppingCartIcon />}
                  >
                    Start Ordering
                  </Button>
                )}
              </Box>
            </Alert>
          )}

          {!vm.isLoading && vm.status === "error" && (
            <Alert severity="error">
              <AlertTitle
                sx={{ display: "flex", alignItems: "center" }}
              >
                <WarningIcon sx={{ mr: 2 }} />
                {vm.errorHeading}
              </AlertTitle>
              <Typography sx={{ mb: 3 }}>{vm.message}</Typography>

              {vm.mode === "email_verification" && (
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
              )}

              <Box sx={{ display: "grid", gap: 2 }}>
                {vm.mode === "email_verification" ? (
                  <>
                    <Button
                      variant="contained"
                      onClick={vm.handleProfileRedirect}
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
                  </>
                ) : (
                  <>
                    <Button
                      variant="outlined"
                      onClick={vm.handleResendActivation}
                      startIcon={<EmailIcon />}
                    >
                      Resend Activation Email
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={vm.handleHomeRedirect}
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
